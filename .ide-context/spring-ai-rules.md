# Spring AI Actionable Development Rules

## 1. Portable Model API Architecture

* **Abstract Interfaces**: Always code against the portable model interfaces rather than provider-specific implementations:
  - `ChatModel` (for LLM chats/completions)
  - `EmbeddingModel` (for generating vector embeddings)
  - `ImageModel` (for text-to-image generation)
  - `SpeechModel` (for text-to-speech conversion)
  - `TranscriptionModel` (for audio transcription)
  - `ModerationModel` (for content filtering)
* **Configuration Over Code**: Swap AI providers (OpenAI, Ollama, Google GenAI, Anthropic, Azure OpenAI) by replacing Spring Boot starters and adjusting `application.properties` / `application.yml` configurations, keeping the Java application code unchanged.

---

## 2. Fluent `ChatClient` & Advisors API

### Instantiating `ChatClient`
* **Rule**: Inject `ChatClient.Builder` (auto-configured by Spring Boot) and configure it in your configuration or service layer.
* **Builder Setup**:
  ```java
  @Configuration
  class AIConfig {
      @Bean
      ChatClient chatClient(ChatClient.Builder builder) {
          return builder
              .defaultSystem("You are a specialized code review assistant.")
              .build();
      }
  }
  ```

### Fluent Execution Patterns
* **Synchronous Call**:
  ```java
  String response = chatClient.prompt()
      .user("Explain the Model Context Protocol.")
      .call()
      .content();
  ```
* **Streaming Response**:
  ```java
  Flux<String> stream = chatClient.prompt()
      .user("List the top 5 design patterns.")
      .stream()
      .content();
  ```
* **Structured Output (POJO Conversion)**:
  ```java
  List<Actor> actors = chatClient.prompt()
      .user("Generate a list of actors in the movie Inception.")
      .call()
      .entity(new ParameterizedTypeReference<List<Actor>>() {});
  ```

### Conversational Memory & Advisors
* **Rule**: Use the Advisors API to inject cross-cutting concerns (like history or RAG) into the chat cycle.
* **Chat Memory Advisor**:
  ```java
  ChatClient chatClient = builder
      .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
      .build();
  ```

---

## 3. Tool & Function Calling

* **Method-level Tools**: Annotate methods inside Spring beans with `@Tool` to make them discoverable by the AI models.
  ```java
  @Component
  class WeatherService {
      @Tool(description = "Get the current weather for a city")
      public String getWeather(String city) {
          return "Sunny, 22C";
      }
  }
  ```
* **Binding Tools to Prompts**:
  ```java
  String response = chatClient.prompt()
      .user("What is the weather in Berlin?")
      .tools("weatherService") // references weatherService bean
      .call()
      .content();
  ```
* **Functional Approach**: Register standard `java.util.Function<Request, Response>` beans. Spring AI auto-wires them for function-calling LLMs.

---

## 4. Vector Stores & Portable Filtering

* **Abstract VectorStore**: Interact with vector databases (PGVector, Pinecone, Redis, Milvus, Chroma) using the common `VectorStore` bean interface.
* **Saving Documents**:
  ```java
  vectorStore.accept(List.of(new Document("Text content", Map.of("category", "tech"))));
  ```
* **Similarity Search**:
  ```java
  List<Document> results = vectorStore.similaritySearch(
      SearchRequest.query("Spring AI")
          .withTopK(5)
          .withSimilarityThreshold(0.7)
  );
  ```
* **Portable Metadata Filtering**: Use the SQL-like metadata expression parser for portable filters across different vector store engines:
  ```java
  FilterExpression filter = new FilterExpressionBuilder()
      .eq("category", "tech")
      .and()
      .in("status", "active", "pending")
      .build();
  List<Document> filteredResults = vectorStore.similaritySearch(
      SearchRequest.query("MCP").withFilterExpression(filter)
  );
  ```

---

## 5. ETL Data Ingestion Pipelines

* **ETL Pipeline Components**:
  - `DocumentReader` (loads raw data; e.g., `PagePdfDocumentReader`, `TextReader`).
  - `DocumentTransformer` (splits/transforms data; e.g., `TokenTextSplitter`).
  - `DocumentWriter` (writes to destination; e.g., `VectorStore`).
* **Implementation Pattern**:
  ```java
  @Component
  class IngestionPipeline {
      private final VectorStore vectorStore;
      
      public IngestionPipeline(VectorStore vectorStore) {
          this.vectorStore = vectorStore;
      }
      
      public void ingest(Resource resource) {
          DocumentReader reader = new TextReader(resource);
          DocumentTransformer splitter = new TokenTextSplitter();
          
          List<Document> documents = splitter.apply(reader.read());
          vectorStore.accept(documents);
      }
  }
  ```

---

## 6. Model Context Protocol (MCP)

* **Client Starters**: Add the appropriate MCP Client Boot Starter dependency to allow Spring AI to interact with external MCP Servers.
* **Server Starters**: Add the MCP Server Boot Starter dependency to expose Spring-managed services/tools dynamically to external clients using STDIO or SSE transport layers.
