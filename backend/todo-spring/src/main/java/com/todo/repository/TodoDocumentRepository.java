package com.todo.repository;

import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Spring Data MongoDB repository — active only on the 'mongodb' profile.
 * Used internally by {@link com.todo.repository.impl.MongoTodoRepositoryAdapter}.
 */
@Profile("mongodb")
public interface TodoDocumentRepository extends MongoRepository<Todo, String> {

    Page<Todo> findAllByStatus(TodoStatus status, Pageable pageable);
}
