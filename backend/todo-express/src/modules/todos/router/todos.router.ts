import { Router } from "express";
import { validate } from "../../../common/middleware/validate.middleware";
import {
  createTodoSchema,
  updateTodoSchema,
  listTodosQuerySchema,
  idParamSchema,
} from "../validators/todo.validators";
import { TodosController } from "../controllers/todos.controller";

export function makeTodosRouter(controller: TodosController): Router {
  const router = Router();

  // GET /api/todos
  router.get("/", validate(listTodosQuerySchema, "query"), controller.list);

  // GET /api/todos/:id
  router.get("/:id", validate(idParamSchema, "params"), controller.getOne);

  // POST /api/todos
  router.post("/", validate(createTodoSchema, "body"), controller.create);

  // PUT /api/todos/:id
  router.put(
    "/:id",
    validate(idParamSchema, "params"),
    validate(updateTodoSchema, "body"),
    controller.update,
  );

  // DELETE /api/todos/:id
  router.delete("/:id", validate(idParamSchema, "params"), controller.remove);

  return router;
}
