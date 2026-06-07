# ── Build stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk-noble AS builder

WORKDIR /build

# Copy wrapper files first — separate layer so dependency downloads are cached
COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
RUN chmod +x mvnw

# Resolve all dependencies before copying source (maximises cache reuse)
COPY pom.xml .
RUN ./mvnw dependency:go-offline -q

# Build the fat jar, skip tests (tests run in CI, not during image build)
COPY src src
RUN ./mvnw package -DskipTests -q

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk-noble AS runtime

WORKDIR /app

# Non-root user — principle of least privilege
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 3001

# --enable-preview is required at runtime because the jar was compiled with Java preview features.
# MaxRAMPercentage caps heap at 75% of the container memory limit.
ENTRYPOINT ["java", "--enable-preview", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
