package com.todo.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Async event handler — equivalent of the BullMQ worker in the NestJS/Express backends.
 * Runs on the {@code asyncExecutor} thread pool defined in {@link com.todo.config.AsyncConfig}.
 */
@Slf4j
@Component
public class TodoEventListener {

    @Async("asyncExecutor")
    @EventListener
    public void onTodoCreated(TodoCreatedEvent event) {
        log.info("Processed event: todo_created id={} title={}", event.getTodoId(), event.getTitle());
    }
}
