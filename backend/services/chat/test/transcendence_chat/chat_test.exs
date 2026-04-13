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

  describe "list_user_conversations/1" do
    test "returns conversations with other user info" do
      user1 = user_fixture()
      user2 = user_fixture()
      {:ok, _conversation} = Chat.get_or_create_conversation(user1.id, user2.id)

      conversations = Chat.list_user_conversations(user1.id)
      assert [%{other_user_name: name}] = conversations
      assert name == user2.username
    end
  end
end
