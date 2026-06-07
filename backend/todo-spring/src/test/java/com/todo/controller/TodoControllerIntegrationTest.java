package com.todo.controller;

import com.todo.dto.request.CreateTodoRequest;
import com.todo.dto.request.UpdateTodoRequest;
import com.todo.dto.response.TodoResponse;
import com.todo.model.TodoStatus;
import com.todo.repository.TodoRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
// Spring Boot 4: @AutoConfigureMockMvc moved to new module/package
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
// Spring Boot 4 ships with Jackson 3 — ObjectMapper is in tools.jackson.databind
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Todos API — integration tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TodoControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;
    @Autowired TodoRepository todoRepository;

    @BeforeEach
    void cleanDb() {
        todoRepository.deleteAll();
    }

    // ── POST /api/todos ────────────────────────────────────────────────────
    @Nested @DisplayName("POST /api/todos")
    class PostTodos {

        @Test @DisplayName("creates todo — 201")
        void creates201() throws Exception {
            var req = new CreateTodoRequest();
            req.setTitle("Integration test");
            req.setPriority(2);

            mockMvc.perform(post("/api/todos")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$._id").isNotEmpty())
                    .andExpect(jsonPath("$.title").value("Integration test"))
                    .andExpect(jsonPath("$.status").value("todo"))
                    .andExpect(jsonPath("$.__v").value(0))
                    .andExpect(header().exists("X-Request-Id"));
        }

        @Test @DisplayName("returns 422 when title is blank")
        void rejects422BlankTitle() throws Exception {
            var req = new CreateTodoRequest();
            req.setTitle("");

            mockMvc.perform(post("/api/todos")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("Validation failed"))
                    .andExpect(jsonPath("$.errors.title").isNotEmpty());
        }

        @Test @DisplayName("returns 422 when priority out of range")
        void rejects422BadPriority() throws Exception {
            var req = new CreateTodoRequest();
            req.setTitle("Valid title");
            req.setPriority(9);

            mockMvc.perform(post("/api/todos")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isUnprocessableEntity());
        }
    }

    // ── GET /api/todos ─────────────────────────────────────────────────────
    @Nested @DisplayName("GET /api/todos")
    class GetTodos {

        @Test @DisplayName("returns empty list")
        void emptyList() throws Exception {
            mockMvc.perform(get("/api/todos"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(0))
                    .andExpect(jsonPath("$.items").isEmpty())
                    .andExpect(jsonPath("$.page").value(1))
                    .andExpect(jsonPath("$.limit").value(10));
        }

        @Test @DisplayName("paginates correctly")
        void paginates() throws Exception {
            for (int i = 0; i < 5; i++) {
                var req = new CreateTodoRequest();
                req.setTitle("Todo " + i);
                mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)));
            }
            mockMvc.perform(get("/api/todos?page=1&limit=3"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(5))
                    .andExpect(jsonPath("$.items", hasSize(3)));
        }

        @Test @DisplayName("filters by status")
        void filterByStatus() throws Exception {
            var done = new CreateTodoRequest();
            done.setTitle("Done task"); done.setStatus(TodoStatus.DONE);
            var todo = new CreateTodoRequest();
            todo.setTitle("Pending task");

            mockMvc.perform(post("/api/todos").contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(done)));
            mockMvc.perform(post("/api/todos").contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(todo)));

            mockMvc.perform(get("/api/todos?status=done"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(1))
                    .andExpect(jsonPath("$.items[0].status").value("done"));
        }

        @Test @DisplayName("returns 400 when limit > 100")
        void rejects400BadLimit() throws Exception {
            mockMvc.perform(get("/api/todos?limit=999"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ── GET /api/todos/{id} ────────────────────────────────────────────────
    @Nested @DisplayName("GET /api/todos/{id}")
    class GetTodoById {

        @Test @DisplayName("returns existing todo")
        void returnsExisting() throws Exception {
            String id = createTodo("Find me");

            mockMvc.perform(get("/api/todos/" + id))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Find me"));
        }

        @Test @DisplayName("returns 404 for unknown id")
        void returns404() throws Exception {
            mockMvc.perform(get("/api/todos/000000000000000000000001"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Todo not found"));
        }
    }

    // ── PUT /api/todos/{id} ────────────────────────────────────────────────
    @Nested @DisplayName("PUT /api/todos/{id}")
    class PutTodo {

        @Test @DisplayName("updates title and status")
        void updates() throws Exception {
            String id = createTodo("Original");

            var req = new UpdateTodoRequest();
            req.setTitle("Updated");
            req.setStatus(TodoStatus.DOING);

            mockMvc.perform(put("/api/todos/" + id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated"))
                    .andExpect(jsonPath("$.status").value("doing"));
        }

        @Test @DisplayName("returns 404 for unknown id")
        void returns404() throws Exception {
            var req = new UpdateTodoRequest();
            req.setTitle("x");
            mockMvc.perform(put("/api/todos/000000000000000000000001")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound());
        }

        @Test @DisplayName("returns 409 on version conflict")
        void returns409OnConflict() throws Exception {
            String id = createTodo("Concurrent");

            var first = new UpdateTodoRequest();
            first.setTitle("First");
            mockMvc.perform(put("/api/todos/" + id)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(first)));

            var stale = new UpdateTodoRequest();
            stale.setTitle("Stale");
            stale.setVersion(0L);

            mockMvc.perform(put("/api/todos/" + id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(stale)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message", containsString("conflict")));
        }
    }

    // ── DELETE /api/todos/{id} ─────────────────────────────────────────────
    @Nested @DisplayName("DELETE /api/todos/{id}")
    class DeleteTodo {

        @Test @DisplayName("deletes todo")
        void deletes() throws Exception {
            String id = createTodo("Delete me");

            mockMvc.perform(delete("/api/todos/" + id))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ok"));

            mockMvc.perform(get("/api/todos/" + id))
                    .andExpect(status().isNotFound());
        }

        @Test @DisplayName("returns 404 for unknown id")
        void returns404() throws Exception {
            mockMvc.perform(delete("/api/todos/000000000000000000000001"))
                    .andExpect(status().isNotFound());
        }
    }

    // ── GET /health ────────────────────────────────────────────────────────
    @Nested @DisplayName("GET /health")
    class Health {

        @Test @DisplayName("returns ok")
        void returnsOk() throws Exception {
            mockMvc.perform(get("/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ok"))
                    .andExpect(jsonPath("$.mongodb").value("up"))
                    .andExpect(jsonPath("$.redis").value("disabled"));
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────
    private String createTodo(String title) throws Exception {
        var req = new CreateTodoRequest();
        req.setTitle(title);

        MvcResult result = mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        TodoResponse response = mapper.readValue(
                result.getResponse().getContentAsString(), TodoResponse.class);
        return response.getId();
    }
}
