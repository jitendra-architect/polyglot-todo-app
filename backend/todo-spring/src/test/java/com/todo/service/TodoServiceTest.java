package com.todo.service;

import com.todo.dto.request.CreateTodoRequest;
import com.todo.dto.request.UpdateTodoRequest;
import com.todo.dto.response.TodoListResponse;
import com.todo.dto.response.TodoResponse;
import com.todo.event.TodoCreatedEvent;
import com.todo.exception.TodoNotFoundException;
import com.todo.mapper.TodoMapper;
import com.todo.model.Todo;
import com.todo.model.TodoStatus;
import com.todo.repository.TodoRepository;
import com.todo.service.impl.TodoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TodoService unit tests")
class TodoServiceTest {

    @Mock TodoRepository todoRepository;
    @Mock CacheManager cacheManager;
    @Mock Cache cache;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock TodoMapper todoMapper;

    TodoServiceImpl service;

    @BeforeEach
    void setUp() {
        when(cacheManager.getCache(anyString())).thenReturn(cache);
        service = new TodoServiceImpl(todoRepository, cacheManager, eventPublisher, todoMapper);
    }

    // ── create() ──────────────────────────────────────────────────────────
    @Nested @DisplayName("create()")
    class Create {

        @Test @DisplayName("saves todo and publishes event")
        void savesAndPublishesEvent() {
            var req = new CreateTodoRequest();
            req.setTitle("Buy milk");
            req.setPriority(2);
            req.setStatus(TodoStatus.TODO);

            Todo saved = new Todo();
            saved.setId("abc123");
            saved.setTitle("Buy milk");
            saved.setPriority(2);
            saved.setStatus(TodoStatus.TODO);
            saved.setVersion(0L);

            TodoResponse expected = new TodoResponse();
            expected.setId("abc123");
            expected.setTitle("Buy milk");

            when(todoRepository.save(any())).thenReturn(saved);
            when(todoMapper.toResponse(saved)).thenReturn(expected);

            TodoResponse result = service.create(req);

            assertThat(result.getTitle()).isEqualTo("Buy milk");
            assertThat(result.getId()).isEqualTo("abc123");

            var captor = ArgumentCaptor.forClass(TodoCreatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().getTodoId()).isEqualTo("abc123");
            verify(cache).clear();
        }
    }

    // ── findAll() ─────────────────────────────────────────────────────────
    @Nested @DisplayName("findAll()")
    class FindAll {

        @Test @DisplayName("returns results from repository when cache misses")
        void returnFromRepo() {
            when(cache.get(anyString(), eq(TodoListResponse.class))).thenReturn(null);

            Todo t = new Todo();
            t.setId("1"); t.setTitle("Test"); t.setStatus(TodoStatus.TODO); t.setPriority(3);
            when(todoRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(t)));
            when(todoMapper.toResponse(any())).thenReturn(new TodoResponse());

            var result = service.findAll(1, 10, null);

            assertThat(result.getTotal()).isEqualTo(1);
            assertThat(result.getItems()).hasSize(1);
        }

        @Test @DisplayName("returns from cache when cache hits")
        void returnFromCache() {
            var cached = new TodoListResponse(List.of(), 0L, 1, 10);
            when(cache.get(anyString(), eq(TodoListResponse.class))).thenReturn(cached);

            var result = service.findAll(1, 10, null);

            assertThat(result).isSameAs(cached);
            verify(todoRepository, never()).findAll(any(Pageable.class));
        }
    }

    // ── findById() ────────────────────────────────────────────────────────
    @Nested @DisplayName("findById()")
    class FindById {

        @Test @DisplayName("returns existing todo")
        void returnsExisting() {
            Todo t = new Todo();
            t.setId("xyz"); t.setTitle("Existing"); t.setStatus(TodoStatus.DONE); t.setPriority(1);

            TodoResponse expected = new TodoResponse();
            expected.setId("xyz");

            when(todoRepository.findById("xyz")).thenReturn(Optional.of(t));
            when(todoMapper.toResponse(t)).thenReturn(expected);

            assertThat(service.findById("xyz").getId()).isEqualTo("xyz");
        }

        @Test @DisplayName("throws TodoNotFoundException for unknown id")
        void throwsForUnknown() {
            when(todoRepository.findById("nope")).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.findById("nope"))
                    .isInstanceOf(TodoNotFoundException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ── update() ─────────────────────────────────────────────────────────
    @Nested @DisplayName("update()")
    class Update {

        @Test @DisplayName("applies partial fields")
        void appliesPartialFields() {
            Todo existing = new Todo();
            existing.setId("u1"); existing.setTitle("Old"); existing.setPriority(1);
            existing.setStatus(TodoStatus.TODO); existing.setVersion(0L);

            Todo saved = new Todo();
            saved.setId("u1"); saved.setTitle("New"); saved.setPriority(4);
            saved.setStatus(TodoStatus.TODO); saved.setVersion(1L);

            when(todoRepository.findById("u1")).thenReturn(Optional.of(existing));
            when(todoRepository.save(any())).thenReturn(saved);
            when(todoMapper.toResponse(saved)).thenReturn(new TodoResponse());

            var req = new UpdateTodoRequest();
            req.setTitle("New");
            req.setPriority(4);

            service.update("u1", req);
            verify(cache).clear();
        }

        @Test @DisplayName("throws OptimisticLockingFailureException on version mismatch")
        void throwsOnVersionConflict() {
            Todo existing = new Todo();
            existing.setId("u2"); existing.setTitle("T"); existing.setPriority(1);
            existing.setStatus(TodoStatus.TODO); existing.setVersion(1L);
            when(todoRepository.findById("u2")).thenReturn(Optional.of(existing));
            when(todoRepository.save(any())).thenThrow(new OptimisticLockingFailureException("conflict"));

            var req = new UpdateTodoRequest();
            req.setVersion(0L);

            assertThatThrownBy(() -> service.update("u2", req))
                    .isInstanceOf(OptimisticLockingFailureException.class);
        }

        @Test @DisplayName("throws TodoNotFoundException for unknown id")
        void throwsForUnknown() {
            when(todoRepository.findById("bad")).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.update("bad", new UpdateTodoRequest()))
                    .isInstanceOf(TodoNotFoundException.class);
        }
    }

    // ── delete() ─────────────────────────────────────────────────────────
    @Nested @DisplayName("delete()")
    class Delete {

        @Test @DisplayName("deletes existing todo")
        void deletesExisting() {
            when(todoRepository.existsById("del1")).thenReturn(true);
            service.delete("del1");
            verify(todoRepository).deleteById("del1");
            verify(cache).clear();
        }

        @Test @DisplayName("throws TodoNotFoundException for unknown id")
        void throwsForUnknown() {
            when(todoRepository.existsById("bad")).thenReturn(false);
            assertThatThrownBy(() -> service.delete("bad"))
                    .isInstanceOf(TodoNotFoundException.class);
        }
    }
}
