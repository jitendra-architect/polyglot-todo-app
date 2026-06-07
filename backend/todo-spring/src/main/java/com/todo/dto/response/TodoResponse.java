package com.todo.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import lombok.Data;

import java.time.Instant;

@Data
public class TodoResponse {

    @JsonProperty("_id")
    private String id;

    private String title;
    private String description;
    private Instant dueDate;
    private TodoStatus status;
    private int priority;
    private Instant createdAt;
    private Instant updatedAt;

    @JsonProperty("__v")
    private Long version;

    public static TodoResponse from(Todo todo) {
        TodoResponse r = new TodoResponse();
        r.setId(todo.getId());
        r.setTitle(todo.getTitle());
        r.setDescription(todo.getDescription());
        r.setDueDate(todo.getDueDate());
        r.setStatus(todo.getStatus());
        r.setPriority(todo.getPriority());
        r.setCreatedAt(todo.getCreatedAt());
        r.setUpdatedAt(todo.getUpdatedAt());
        r.setVersion(todo.getVersion());
        return r;
    }
}
