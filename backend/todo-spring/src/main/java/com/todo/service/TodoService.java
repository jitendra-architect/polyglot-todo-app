package com.todo.service;

import com.todo.dto.request.CreateTodoRequest;
import com.todo.dto.request.UpdateTodoRequest;
import com.todo.dto.response.TodoListResponse;
import com.todo.dto.response.TodoResponse;
import com.todo.model.TodoStatus;

/**
 * Contract for all Todo business operations.
 * Controllers and other callers depend on this interface, not the implementation.
 */
public interface TodoService {

    TodoListResponse findAll(int page, int limit, TodoStatus status);

    TodoResponse findById(String id);

    TodoResponse create(CreateTodoRequest request);

    TodoResponse update(String id, UpdateTodoRequest request);

    void delete(String id);
}
