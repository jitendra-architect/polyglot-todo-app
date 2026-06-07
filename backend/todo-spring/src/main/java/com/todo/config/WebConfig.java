package com.todo.config;

import com.todo.model.TodoStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC customization.
 * Registers a case-insensitive {@code String → TodoStatus} converter so query
 * parameters like {@code ?status=done} (lowercase) are accepted by Spring's
 * data-binding layer (which does not go through Jackson).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, TodoStatus.class, source -> {
            for (TodoStatus s : TodoStatus.values()) {
                if (s.getValue().equalsIgnoreCase(source.trim())) return s;
            }
            throw new IllegalArgumentException(
                    "Unknown TodoStatus: '" + source + "'. Valid values: todo, doing, done");
        });
    }
}
