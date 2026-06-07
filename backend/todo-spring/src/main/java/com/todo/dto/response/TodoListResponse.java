package com.todo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class TodoListResponse {
    private List<TodoResponse> items;
    private long total;
    private int page;
    private int limit;
}
