package com.todo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA configuration — active only on the 'postgresql' profile.
 * Enables @CreatedDate and @LastModifiedDate population on TodoEntity rows.
 */
@Configuration
@Profile("postgresql")
@EnableJpaAuditing
public class JpaConfig {
}
