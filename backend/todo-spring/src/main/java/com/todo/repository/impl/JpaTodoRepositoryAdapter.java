package com.todo.repository.impl;

import com.todo.model.Todo;
import com.todo.model.TodoEntity;
import com.todo.model.TodoStatus;
import com.todo.repository.TodoJpaRepository;
import com.todo.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * TodoRepository implementation backed by PostgreSQL via JPA.
 * Active only when the 'postgresql' Spring profile is set.
 * Handles bidirectional mapping between the {@link Todo} domain model
 * and the {@link TodoEntity} JPA entity.
 */
@Repository
@Profile("postgresql")
@RequiredArgsConstructor
public class JpaTodoRepositoryAdapter implements TodoRepository {

    private final TodoJpaRepository delegate;

    @Override
    public Page<Todo> findAll(Pageable pageable) {
        return delegate.findAll(pageable).map(this::toDomain);
    }

    @Override
    public Page<Todo> findAllByStatus(TodoStatus status, Pageable pageable) {
        return delegate.findAllByStatus(status, pageable).map(this::toDomain);
    }

    @Override
    public Optional<Todo> findById(String id) {
        return delegate.findById(id).map(this::toDomain);
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
        return toDomain(delegate.save(toEntity(todo)));
    }

    // ── Mapping ───────────────────────────────────────────────────────────

    private Todo toDomain(TodoEntity entity) {
        Todo todo = new Todo();
        todo.setId(entity.getId());
        todo.setTitle(entity.getTitle());
        todo.setDescription(entity.getDescription());
        todo.setDueDate(entity.getDueDate());
        todo.setStatus(entity.getStatus());
        todo.setPriority(entity.getPriority());
        todo.setCreatedAt(entity.getCreatedAt());
        todo.setUpdatedAt(entity.getUpdatedAt());
        todo.setVersion(entity.getVersion());
        return todo;
    }

    private TodoEntity toEntity(Todo todo) {
        TodoEntity entity = new TodoEntity();
        if (todo.getId() != null)      entity.setId(todo.getId());
        entity.setTitle(todo.getTitle());
        entity.setDescription(todo.getDescription());
        entity.setDueDate(todo.getDueDate());
        entity.setStatus(todo.getStatus());
        entity.setPriority(todo.getPriority());
        // createdAt / updatedAt populated by @CreatedDate / @LastModifiedDate (JPA auditing)
        if (todo.getVersion() != null) entity.setVersion(todo.getVersion());
        return entity;
    }
}
