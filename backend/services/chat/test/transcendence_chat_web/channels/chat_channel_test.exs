defmodule TranscendenceChatWeb.ChatChannelTest do
  use TranscendenceChatWeb.ChannelCase

  import TranscendenceChat.ChatFixtures

  setup do
    user = user_fixture()
    other_user = user_fixture()
    {:ok, conversation} = TranscendenceChat.Chat.get_or_create_conversation(user.id, other_user.id)

    {:ok, _, socket} =
      TranscendenceChatWeb.UserSocket
      |> socket("user_id", %{user_id: user.id})
      |> subscribe_and_join(TranscendenceChatWeb.ChatChannel, "chat:#{conversation.id}")

    %{socket: socket, user: user, other_user: other_user, conversation: conversation}
  end

  test "join is rejected for unauthorized user" do
    user = user_fixture(%{username: "outsider"})
    conversation = conversation_fixture()

    assert {:error, %{reason: "unauthorized"}} =
             TranscendenceChatWeb.UserSocket
             |> socket("user_id", %{user_id: user.id})
             |> subscribe_and_join(TranscendenceChatWeb.ChatChannel, "chat:#{conversation.id}")
  end

  test "message broadcasts to channel", %{socket: socket} do
    push(socket, "message", %{"body" => "hello"})
    assert_broadcast "message", %{body: "hello"}
  end

  test "typing broadcasts to other users", %{socket: socket, user: user} do
    push(socket, "typing", %{"is_typing" => true})
    assert_broadcast "typing", %{user_id: uid, is_typing: true} when uid == user.id
  end

  test "messages_read broadcasts to other users", %{socket: socket, user: user} do
    push(socket, "messages_read", %{})
    assert_broadcast "messages_read", %{user_id: uid} when uid == user.id
  end
end
