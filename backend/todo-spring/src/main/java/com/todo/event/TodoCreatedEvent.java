package com.todo.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TodoCreatedEvent extends ApplicationEvent {

    private final String todoId;
    private final String title;

    public TodoCreatedEvent(Object source, String todoId, String title) {
        super(source);
        this.todoId = todoId;
        this.title = title;
    }
}
