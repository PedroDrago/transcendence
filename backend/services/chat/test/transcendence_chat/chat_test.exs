defmodule TranscendenceChat.ChatTest do
  use TranscendenceChat.DataCase

  alias TranscendenceChat.Chat

  import TranscendenceChat.ChatFixtures

  describe "conversations" do
    test "get_or_create_conversation/2 creates a new conversation" do
      user1 = user_fixture()
      user2 = user_fixture()

      assert {:ok, conversation} = Chat.get_or_create_conversation(user1.id, user2.id)
      assert conversation.id
      assert conversation.type == "direct"
    end

    test "get_or_create_conversation/2 returns existing conversation" do
      user1 = user_fixture()
      user2 = user_fixture()

      {:ok, conv1} = Chat.get_or_create_conversation(user1.id, user2.id)
      {:ok, conv2} = Chat.get_or_create_conversation(user1.id, user2.id)

      assert conv1.id == conv2.id
    end

    test "user_in_conversation?/2 returns true for participant" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, conversation} = Chat.get_or_create_conversation(user1.id, user2.id)

      assert Chat.user_in_conversation?(user1.id, conversation.id)
      assert Chat.user_in_conversation?(user2.id, conversation.id)
    end

    test "user_in_conversation?/2 returns false for non-participant" do
      user1 = user_fixture()
      user2 = user_fixture()
      outsider = user_fixture()
      {:ok, conversation} = Chat.get_or_create_conversation(user1.id, user2.id)

      refute Chat.user_in_conversation?(outsider.id, conversation.id)
    end
  end

  describe "group conversations" do
    test "create_group_conversation/3 creates group with admin and members" do
      creator = user_fixture()
      member1 = user_fixture()
      member2 = user_fixture()

      assert {:ok, conversation} =
               Chat.create_group_conversation(creator.id, "Test Group", [member1.id, member2.id])

      assert conversation.type == "group"
      assert conversation.name == "Test Group"
      assert conversation.created_by == creator.id

      # Creator deve ser admin
      assert Chat.user_is_admin?(creator.id, conversation.id)
      # Members não são admin
      refute Chat.user_is_admin?(member1.id, conversation.id)
    end

    test "add_group_member/2 adds a new member" do
      %{conversation: conv, creator: creator} = group_conversation_fixture()
      new_member = user_fixture()

      assert {:ok, _} = Chat.add_group_member(conv.id, new_member.id)
      assert Chat.user_in_conversation?(new_member.id, conv.id)
      refute Chat.user_is_admin?(new_member.id, conv.id)
    end

    test "remove_group_member/2 removes a member" do
      member = user_fixture()
      %{conversation: conv} = group_conversation_fixture(%{members: [member]})

      Chat.remove_group_member(conv.id, member.id)
      refute Chat.user_in_conversation?(member.id, conv.id)
    end

    test "update_group_name/2 updates the name" do
      %{conversation: conv} = group_conversation_fixture()

      assert {:ok, updated} = Chat.update_group_name(conv.id, "New Name")
      assert updated.name == "New Name"
    end

    test "list_conversation_member_ids/1 returns all member ids" do
      creator = user_fixture()
      member = user_fixture()
      %{conversation: conv} =
        group_conversation_fixture(%{creator: creator, members: [member], name: "Members Test"})

      ids = Chat.list_conversation_member_ids(conv.id)
      assert creator.id in ids
      assert member.id in ids
    end
  end

  describe "messages" do
    test "create_message/1 with valid data creates a message" do
      user = user_fixture()
      conversation = conversation_fixture()

      assert {:ok, message} =
               Chat.create_message(%{body: "hello", user_id: user.id, conversation_id: conversation.id})

      assert message.body == "hello"
    end

    test "create_message/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Chat.create_message(%{body: nil})
    end

    test "list_messages_for_conversation/1 returns messages in order" do
      user = user_fixture()
      conversation = conversation_fixture()

      {:ok, _msg1} = Chat.create_message(%{body: "first", user_id: user.id, conversation_id: conversation.id})
      {:ok, _msg2} = Chat.create_message(%{body: "second", user_id: user.id, conversation_id: conversation.id})

      messages = Chat.list_messages_for_conversation(conversation.id)
      assert length(messages) == 2
      assert [%{body: "first"}, %{body: "second"}] = messages
    end
  end

  describe "read receipts" do
    test "mark_messages_read/2 marks unread messages" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, conv} = Chat.get_or_create_conversation(user1.id, user2.id)

      {:ok, _msg1} = Chat.create_message(%{body: "hello", user_id: user1.id, conversation_id: conv.id})
      {:ok, _msg2} = Chat.create_message(%{body: "hey", user_id: user1.id, conversation_id: conv.id})

      # user2 marca como lidas
      assert {:ok, 2} = Chat.mark_messages_read(conv.id, user2.id)

      # Segunda vez não marca nada (já leu)
      assert {:ok, 0} = Chat.mark_messages_read(conv.id, user2.id)
    end

    test "mark_messages_read/2 does not mark own messages" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, conv} = Chat.get_or_create_conversation(user1.id, user2.id)

      {:ok, _} = Chat.create_message(%{body: "my own", user_id: user1.id, conversation_id: conv.id})

      # user1 tentando marcar suas próprias mensagens — deve ser 0
      assert {:ok, 0} = Chat.mark_messages_read(conv.id, user1.id)
    end

    test "get_read_status/1 returns who read what" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, conv} = Chat.get_or_create_conversation(user1.id, user2.id)

      {:ok, msg} = Chat.create_message(%{body: "hello", user_id: user1.id, conversation_id: conv.id})
      Chat.mark_messages_read(conv.id, user2.id)

      status = Chat.get_read_status(conv.id)
      assert Map.has_key?(status, msg.id)
      assert user2.id in status[msg.id]
    end
  end

  describe "user status" do
    test "update_last_seen/1 creates and updates last seen" do
      user = user_fixture()

      assert {:ok, _} = Chat.update_last_seen(user.id)
      first_seen = Chat.get_last_seen(user.id)
      assert first_seen

      # Segundo update deve sobrescrever
      assert {:ok, _} = Chat.update_last_seen(user.id)
      assert Chat.get_last_seen(user.id)
    end

    test "get_last_seen/1 returns nil for unknown user" do
      assert Chat.get_last_seen(Ecto.UUID.generate()) == nil
    end
  end

  describe "list_user_conversations/1" do
    test "returns direct conversations with other user info" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, _conversation} = Chat.get_or_create_conversation(user1.id, user2.id)

      conversations = Chat.list_user_conversations(user1.id)
      assert [%{type: "direct", other_user_name: name}] = conversations
      assert name == user2.username
    end

    test "returns group conversations with members" do
      creator = user_fixture()
      member = user_fixture()

      %{conversation: _conv} =
        group_conversation_fixture(%{creator: creator, members: [member], name: "My Group"})

      conversations = Chat.list_user_conversations(creator.id)
      assert [%{type: "group", name: "My Group", members: members}] = conversations
      assert length(members) == 2
    end
  end
end
