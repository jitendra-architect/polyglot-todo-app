package com.todo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@Profile("mongodb")
@EnableMongoAuditing
public class MongoConfig {
    // Enables @CreatedDate and @LastModifiedDate population on Todo documents.
}
