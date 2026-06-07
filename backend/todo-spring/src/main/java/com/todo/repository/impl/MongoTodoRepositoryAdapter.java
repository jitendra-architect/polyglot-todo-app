package com.todo.repository.impl;

import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import com.todo.repository.TodoDocumentRepository;
import com.todo.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * TodoRepository implementation backed by MongoDB.
 * Active only when the 'mongodb' Spring profile is set.
 */
@Repository
@Profile("mongodb")
@RequiredArgsConstructor
public class MongoTodoRepositoryAdapter implements TodoRepository {

    private final TodoDocumentRepository delegate;

    @Override
    public Page<Todo> findAll(Pageable pageable) {
        return delegate.findAll(pageable);
    }

    @Override
    public Page<Todo> findAllByStatus(TodoStatus status, Pageable pageable) {
        return delegate.findAllByStatus(status, pageable);
    }

    @Override
    public Optional<Todo> findById(String id) {
        return delegate.findById(id);
    }

    @Override
    public boolean existsById(String id) {
        return delegate.existsById(id);
    }

    @Override
    public void deleteById(String id) {
        delegate.deleteById(id);
    }

    @Override
    public Todo save(Todo todo) {
        return delegate.save(todo);
    }
}
