defmodule TranscendenceChat.ChatTest do
  use TranscendenceChat.DataCase

  alias TranscendenceChat.Chat

  describe "users" do
    alias TranscendenceChat.Chat.User

    import TranscendenceChat.ChatFixtures

    @invalid_attrs %{name: nil}

    test "list_users/0 returns all users" do
      user = user_fixture()
      assert Chat.list_users() == [user]
    end

    test "get_user!/1 returns the user with given id" do
      user = user_fixture()
      assert Chat.get_user!(user.id) == user
    end

    test "create_user/1 with valid data creates a user" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %User{} = user} = Chat.create_user(valid_attrs)
      assert user.name == "some name"
    end

    test "create_user/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Chat.create_user(@invalid_attrs)
    end

    test "update_user/2 with valid data updates the user" do
      user = user_fixture()
      update_attrs = %{name: "some updated name"}

      assert {:ok, %User{} = user} = Chat.update_user(user, update_attrs)
      assert user.name == "some updated name"
    end

    test "update_user/2 with invalid data returns error changeset" do
      user = user_fixture()
      assert {:error, %Ecto.Changeset{}} = Chat.update_user(user, @invalid_attrs)
      assert user == Chat.get_user!(user.id)
    end

    test "delete_user/1 deletes the user" do
      user = user_fixture()
      assert {:ok, %User{}} = Chat.delete_user(user)
      assert_raise Ecto.NoResultsError, fn -> Chat.get_user!(user.id) end
    end

    test "change_user/1 returns a user changeset" do
      user = user_fixture()
      assert %Ecto.Changeset{} = Chat.change_user(user)
    end
  end

  describe "conversations" do
    alias TranscendenceChat.Chat.Conversation

    import TranscendenceChat.ChatFixtures

    test "list_conversations/0 returns all conversations" do
      conversation = conversation_fixture()
      assert Chat.list_conversations() == [conversation]
    end

    test "get_conversation!/1 returns the conversation with given id" do
      conversation = conversation_fixture()
      assert Chat.get_conversation!(conversation.id) == conversation
    end

    test "create_conversation/1 with valid data creates a conversation" do
      assert {:ok, %Conversation{}} = Chat.create_conversation(%{})
    end

    test "delete_conversation/1 deletes the conversation" do
      conversation = conversation_fixture()
      assert {:ok, %Conversation{}} = Chat.delete_conversation(conversation)
      assert_raise Ecto.NoResultsError, fn -> Chat.get_conversation!(conversation.id) end
    end

    test "change_conversation/1 returns a conversation changeset" do
      conversation = conversation_fixture()
      assert %Ecto.Changeset{} = Chat.change_conversation(conversation)
    end
  end

  describe "conversation_users" do
    alias TranscendenceChat.Chat.ConversationUser

    import TranscendenceChat.ChatFixtures

    test "list_conversation_users/0 returns all conversation_users" do
      conversation_user = conversation_user_fixture()
      assert Chat.list_conversation_users() == [conversation_user]
    end

    test "get_conversation_user!/1 returns the conversation_user with given id" do
      conversation_user = conversation_user_fixture()
      assert Chat.get_conversation_user!(conversation_user.id) == conversation_user
    end

    test "create_conversation_user/1 with valid data creates a conversation_user" do
      user = user_fixture()
      conversation = conversation_fixture()

      assert {:ok, %ConversationUser{}} =
               Chat.create_conversation_user(%{user_id: user.id, conversation_id: conversation.id})
    end

    test "create_conversation_user/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Chat.create_conversation_user(%{})
    end

    test "delete_conversation_user/1 deletes the conversation_user" do
      conversation_user = conversation_user_fixture()
      assert {:ok, %ConversationUser{}} = Chat.delete_conversation_user(conversation_user)
      assert_raise Ecto.NoResultsError, fn -> Chat.get_conversation_user!(conversation_user.id) end
    end

    test "change_conversation_user/1 returns a conversation_user changeset" do
      conversation_user = conversation_user_fixture()
      assert %Ecto.Changeset{} = Chat.change_conversation_user(conversation_user)
    end
  end

  describe "messages" do
    alias TranscendenceChat.Chat.Message

    import TranscendenceChat.ChatFixtures

    test "list_messages/0 returns all messages" do
      message = message_fixture()
      assert Chat.list_messages() == [message]
    end

    test "get_message!/1 returns the message with given id" do
      message = message_fixture()
      assert Chat.get_message!(message.id) == message
    end

    test "create_message/1 with valid data creates a message" do
      user = user_fixture()
      conversation = conversation_fixture()

      assert {:ok, %Message{} = message} =
               Chat.create_message(%{body: "some body", user_id: user.id, conversation_id: conversation.id})

      assert message.body == "some body"
    end

    test "create_message/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Chat.create_message(%{body: nil})
    end

    test "update_message/2 with valid data updates the message" do
      message = message_fixture()
      update_attrs = %{body: "some updated body"}

      assert {:ok, %Message{} = message} = Chat.update_message(message, update_attrs)
      assert message.body == "some updated body"
    end

    test "update_message/2 with invalid data returns error changeset" do
      message = message_fixture()
      assert {:error, %Ecto.Changeset{}} = Chat.update_message(message, %{body: nil})
      assert message == Chat.get_message!(message.id)
    end

    test "delete_message/1 deletes the message" do
      message = message_fixture()
      assert {:ok, %Message{}} = Chat.delete_message(message)
      assert_raise Ecto.NoResultsError, fn -> Chat.get_message!(message.id) end
    end

    test "change_message/1 returns a message changeset" do
      message = message_fixture()
      assert %Ecto.Changeset{} = Chat.change_message(message)
    end
  end
end
