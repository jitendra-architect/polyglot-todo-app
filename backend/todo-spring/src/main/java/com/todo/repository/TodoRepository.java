package com.todo.repository;

import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TodoRepository extends MongoRepository<Todo, String> {

    Page<Todo> findAllByStatus(TodoStatus status, Pageable pageable);
}
