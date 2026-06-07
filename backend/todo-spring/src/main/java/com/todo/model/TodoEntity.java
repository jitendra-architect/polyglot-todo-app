package com.todo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * JPA entity representing a Todo row in PostgreSQL.
 * Mirrors the fields of {@link Todo} but uses Jakarta Persistence annotations.
 * Activated only when the 'postgresql' Spring profile is active.
 */
@Data
@NoArgsConstructor
@Entity
@Table(
    name = "todos",
    indexes = @Index(name = "idx_todos_status_due_date", columnList = "status, due_date")
)
@EntityListeners(AuditingEntityListener.class)
public class TodoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "due_date")
    private Instant dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TodoStatus status = TodoStatus.TODO;

    @Column(nullable = false)
    private int priority = 3;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version")
    private Long version;
}
