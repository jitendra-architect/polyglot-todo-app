package com.todo.repository;

import com.todo.model.TodoEntity;
import com.todo.model.TodoStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository — active only on the 'postgresql' profile.
 * Used internally by {@link com.todo.repository.impl.JpaTodoRepositoryAdapter}.
 */
@Profile("postgresql")
public interface TodoJpaRepository extends JpaRepository<TodoEntity, String> {

    Page<TodoEntity> findAllByStatus(TodoStatus status, Pageable pageable);
}
