package com.todo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document for a Todo item.
 * {@code @Version} drives optimistic-locking: a concurrent write with a stale
 * version throws {@link org.springframework.dao.OptimisticLockingFailureException}.
 * The version is serialised as {@code __v} for API parity with the NestJS/Express backends.
 */
@Data
@NoArgsConstructor
@Document(collection = "todos")
@CompoundIndex(def = "{'status': 1, 'dueDate': 1}")
public class Todo {

    @Id
    private String id;

    private String title;

    private String description;

    private Instant dueDate;

    private TodoStatus status = TodoStatus.TODO;

    private int priority = 3;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    @JsonProperty("__v")
    private Long version;
}
