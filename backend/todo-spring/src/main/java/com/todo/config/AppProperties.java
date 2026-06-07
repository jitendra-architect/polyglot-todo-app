package com.todo.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed configuration properties bound from the {@code app.*} namespace.
 * <p>
 * Registered via {@code @ConfigurationPropertiesScan} on the main application
 * class — no {@code @Component} needed.
 */
@Data
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Redis redis = new Redis();
    private Cache cache = new Cache();

    @Data
    public static class Redis {
        private boolean enabled = false;
    }

    @Data
    public static class Cache {
        private int ttlSeconds = 30;
    }
}
