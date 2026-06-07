package com.todo.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TodoStatus {
    TODO("todo"),
    DOING("doing"),
    DONE("done");

    private final String value;

    TodoStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
