defmodule TranscendenceChatWeb.GroupController do
  use TranscendenceChatWeb, :controller

  alias TranscendenceChat.Chat

  # Todas as actions deste controller rodam após o plug `Authenticate`,
  # então `conn.assigns.current_user.id` é a única fonte confiável de
  # identidade. O cliente não envia mais `user_id`/`requester_id`.

  # POST /api/group
  # Body: {"name": "Group Name", "member_ids": ["uuid1", "uuid2"]}
  def create(conn, %{"name" => name, "member_ids" => member_ids}) do
    creator_id = conn.assigns.current_user.id

    case Chat.create_group_conversation(creator_id, name, member_ids) do
      {:ok, conversation} ->
        conn
        |> put_status(:created)
        |> json(%{conversation_id: conversation.id, name: name})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  # POST /api/group/:id/members
  # Body: {"new_member_id": "uuid"}
  def add_member(conn, %{"id" => id, "new_member_id" => new_member_id}) do
    conversation_id = String.to_integer(id)
    requester_id = conn.assigns.current_user.id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      case Chat.add_group_member(conversation_id, new_member_id) do
        {:ok, _} -> json(conn, %{ok: true})
        {:error, _} -> conn |> put_status(:conflict) |> json(%{error: "could not add member"})
      end
    else
      conn |> put_status(:forbidden) |> json(%{error: "only admins can add members"})
    end
  end

  # DELETE /api/group/:id/members/:user_id
  def remove_member(conn, %{"id" => id, "user_id" => user_id}) do
    conversation_id = String.to_integer(id)
    requester_id = conn.assigns.current_user.id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      Chat.remove_group_member(conversation_id, user_id)
      json(conn, %{ok: true})
    else
      conn |> put_status(:forbidden) |> json(%{error: "only admins can remove members"})
    end
  end

  # PATCH /api/group/:id
  # Body: {"name": "New Name"}
  def update(conn, %{"id" => id, "name" => name}) do
    conversation_id = String.to_integer(id)
    requester_id = conn.assigns.current_user.id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      {:ok, _} = Chat.update_group_name(conversation_id, name)
      json(conn, %{ok: true, name: name})
    else
      conn |> put_status(:forbidden) |> json(%{error: "only admins can update group"})
    end
  end
end
