package com.todo.service.impl;

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
import com.todo.service.TodoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TodoServiceImpl implements TodoService {

    private static final String CACHE_NAME = "todos";

    private final TodoRepository todoRepository;
    private final CacheManager cacheManager;
    private final ApplicationEventPublisher eventPublisher;
    private final TodoMapper todoMapper;

    // ── List ──────────────────────────────────────────────────────────────
    @Override
    public TodoListResponse findAll(int page, int limit, TodoStatus status) {
        String cacheKey = buildCacheKey(page, limit, status);
        Cache cache = cacheManager.getCache(CACHE_NAME);

        if (cache != null) {
            TodoListResponse cached = cache.get(cacheKey, TodoListResponse.class);
            if (cached != null) {
                log.debug("Cache hit: {}", cacheKey);
                return cached;
            }
        }

        PageRequest pageable = PageRequest.of(
                page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Todo> todoPage = (status != null)
                ? todoRepository.findAllByStatus(status, pageable)
                : todoRepository.findAll(pageable);

        List<TodoResponse> items = todoPage.getContent().stream()
                .map(todoMapper::toResponse)
                .toList();

        TodoListResponse result = new TodoListResponse(
                items, todoPage.getTotalElements(), page, limit);

        if (cache != null) cache.put(cacheKey, result);
        return result;
    }

    // ── Get by id ─────────────────────────────────────────────────────────
    @Override
    public TodoResponse findById(String id) {
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new TodoNotFoundException(id));
        return todoMapper.toResponse(todo);
    }

    // ── Create ────────────────────────────────────────────────────────────
    @Override
    public TodoResponse create(CreateTodoRequest request) {
        Todo todo = new Todo();
        todo.setTitle(request.getTitle().trim());
        todo.setDescription(request.getDescription());
        todo.setDueDate(request.getDueDate());
        todo.setStatus(request.getStatus() != null ? request.getStatus() : TodoStatus.TODO);
        todo.setPriority(request.getPriority());

        Todo saved = todoRepository.save(todo);
        evictListCache();

        eventPublisher.publishEvent(new TodoCreatedEvent(this, saved.getId(), saved.getTitle()));
        return todoMapper.toResponse(saved);
    }

    // ── Update ────────────────────────────────────────────────────────────
    /**
     * Applies partial updates. If {@link UpdateTodoRequest#getVersion()} is provided,
     * it is injected into the document so Spring Data's optimistic-locking check fires
     * an {@link org.springframework.dao.OptimisticLockingFailureException} on mismatch,
     * which {@link com.todo.common.GlobalExceptionHandler} maps to HTTP 409.
     */
    @Override
    public TodoResponse update(String id, UpdateTodoRequest request) {
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new TodoNotFoundException(id));

        if (request.getTitle() != null)       todo.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) todo.setDescription(request.getDescription());
        if (request.getDueDate() != null)     todo.setDueDate(request.getDueDate());
        if (request.getStatus() != null)      todo.setStatus(request.getStatus());
        if (request.getPriority() != null)    todo.setPriority(request.getPriority());
        if (request.getVersion() != null)     todo.setVersion(request.getVersion());

        Todo saved = todoRepository.save(todo);
        evictListCache();
        return todoMapper.toResponse(saved);
    }

    // ── Delete ────────────────────────────────────────────────────────────
    @Override
    public void delete(String id) {
        if (!todoRepository.existsById(id)) {
            throw new TodoNotFoundException(id);
        }
        todoRepository.deleteById(id);
        evictListCache();
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private void evictListCache() {
        Cache cache = cacheManager.getCache(CACHE_NAME);
        if (cache != null) cache.clear();
    }

    private String buildCacheKey(int page, int limit, TodoStatus status) {
        return String.format("list:p%d:l%d:s%s",
                page, limit, status != null ? status.getValue() : "all");
    }
}
