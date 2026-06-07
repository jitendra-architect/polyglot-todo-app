package com.todo.controller;

import com.todo.dto.request.CreateTodoRequest;
import com.todo.dto.request.UpdateTodoRequest;
import com.todo.dto.response.DeleteResponse;
import com.todo.dto.response.TodoListResponse;
import com.todo.dto.response.TodoResponse;
import com.todo.model.TodoStatus;
import com.todo.service.TodoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
@Validated
public class TodoController {

    private final TodoService todoService;

    /** GET /api/todos?page=1&limit=10&status=todo */
    @GetMapping
    public TodoListResponse list(
            @RequestParam(defaultValue = "1")  @Min(1)           int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit,
            @RequestParam(required = false)                       TodoStatus status) {
        return todoService.findAll(page, limit, status);
    }

    /** GET /api/todos/{id} */
    @GetMapping("/{id}")
    public TodoResponse get(@PathVariable String id) {
        return todoService.findById(id);
    }

    /** POST /api/todos */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TodoResponse create(@Valid @RequestBody CreateTodoRequest request) {
        return todoService.create(request);
    }

    /** PUT /api/todos/{id} */
    @PutMapping("/{id}")
    public TodoResponse update(@PathVariable String id,
                                @Valid @RequestBody UpdateTodoRequest request) {
        return todoService.update(id, request);
    }

    /** DELETE /api/todos/{id} */
    @DeleteMapping("/{id}")
    public DeleteResponse delete(@PathVariable String id) {
        todoService.delete(id);
        return new DeleteResponse("ok");
    }
}
