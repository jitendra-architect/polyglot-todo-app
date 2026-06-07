package com.todo.repository;

import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/**
 * Database-agnostic repository abstraction for Todo operations.
 * Implementations are swapped at startup based on the active Spring profile:
 *   'mongodb'    → MongoTodoRepositoryAdapter
 *   'postgresql' → JpaTodoRepositoryAdapter
 */
public interface TodoRepository {

    Page<Todo> findAll(Pageable pageable);

    Page<Todo> findAllByStatus(TodoStatus status, Pageable pageable);

    Optional<Todo> findById(String id);

    boolean existsById(String id);

    void deleteById(String id);

    Todo save(Todo todo);
}
