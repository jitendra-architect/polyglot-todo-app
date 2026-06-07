package com.todo.controller;

import com.todo.config.AppProperties;
import com.todo.dto.response.HealthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final MongoTemplate mongoTemplate;
    private final AppProperties props;

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse(
                "ok",
                mongoStatus(),
                props.getRedis().isEnabled() ? "enabled" : "disabled",
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000L
        );
    }

    private String mongoStatus() {
        try {
            mongoTemplate.executeCommand("{ ping: 1 }");
            return "up";
        } catch (Exception e) {
            return "down";
        }
    }
}
