# Senior Design & Architecture Interview Question Bank

**120 questions on OOP, SOLID, design patterns, DDD, and microservices architecture — with model answers, explanations and follow-ups.**

Third companion to the Java and Data/Messaging banks. Same structure: the *Answer* is what you say out loud, *Why it matters* is the reasoning you need to survive being pushed, *Follow-ups* are what gets asked next.

This bank is different in one respect. The other two test knowledge that is mostly right or wrong. This one tests **judgement**, and interviewers are listening for whether you apply principles or recite them. The candidate who can name all five SOLID principles is common; the one who can explain where SRP and DRY conflict, and which one they'd sacrifice, is not.

It is also shorter than the other two by design. There is no value in a question per GoF pattern when half of them are one-line lambdas in modern Java — the remaining ones are covered together in section 10. Where a topic is handled in the other banks (idempotency, sagas, the outbox, circuit breakers, retries, Kafka ordering), this bank cross-references rather than repeats.

---

## Contents

1. [OOP & Design Fundamentals](#1-oop--design-fundamentals) (Q1–Q14)
2. [SOLID & Design Principles](#2-solid--design-principles) (Q15–Q26)
3. [Design Patterns](#3-design-patterns) (Q27–Q45)
4. [Domain-Driven Design](#4-domain-driven-design) (Q46–Q52)
5. [Architectural Styles & Structure](#5-architectural-styles--structure) (Q53–Q60)
6. [Microservices: Decomposition & Boundaries](#6-microservices-decomposition--boundaries) (Q61–Q78)
7. [Microservices: Communication & Integration](#7-microservices-communication--integration) (Q79–Q88)
8. [Microservices: Data & Consistency](#8-microservices-data--consistency) (Q89–Q95)
9. [Operations, Testing & Organisation](#9-operations-testing--organisation) (Q96–Q107)
10. [Remaining Patterns & Topics](#10-remaining-patterns--topics) (Q108–Q120)

---

## 1. OOP & Design Fundamentals

### Q1. What do the four pillars of OOP actually buy you?

**Answer.** Reciting "encapsulation, inheritance, polymorphism, abstraction" is a junior answer. What they're *for*:

- **Encapsulation** — protecting invariants. The point isn't hiding fields, it's that the object controls every transition of its own state, so an invalid state is unreachable rather than merely discouraged.
- **Abstraction** — managing complexity by exposing a contract and hiding the mechanism, so callers can be written and changed independently of the implementation.
- **Polymorphism** — allowing new behaviour to be added without modifying existing code. This is the engine behind most of OCP.
- **Inheritance** — reuse of implementation. Honestly the weakest of the four, and the one modern design uses least; it exists mostly to enable subtype polymorphism, which interfaces provide without the coupling.

**Why it matters.** The senior framing is that these are *tools for managing change*, not a taxonomy to memorise. Every one of them earns its place by making some future modification cheaper. If a use of inheritance doesn't make something cheaper to change, it's decoration.

**Follow-up: Is OOP still the right default?**
For modelling systems with identity, lifecycle and invariants — an order, an account, a payment — yes. For data transformation pipelines, functional style is usually cleaner, and modern Java supports it well. The interesting shift is that records plus sealed interfaces plus pattern matching give you algebraic data types, which are a better fit than a class hierarchy when the set of types is closed and the operations keep growing. Good Java in 2026 uses both, chosen by problem shape.

---

### Q2. Encapsulation is more than private fields. Explain.

**Answer.** A class with private fields and a public getter and setter for every one of them has no encapsulation at all — it's a struct with extra typing. The state is fully exposed, just through a slightly longer syntax, and any caller can drive the object into an invalid state.

Real encapsulation means the object's public API is expressed in terms of *what it does*, not what it holds:

```java
// no encapsulation
account.setBalance(account.getBalance().subtract(amount));

// encapsulated: the invariant lives inside
account.withdraw(amount);   // throws InsufficientFundsException
```

In the second form, the overdraft rule cannot be bypassed and cannot be duplicated across seventeen call sites. That's the payoff — the invariant has exactly one home.

**Why it matters.** This connects directly to the anemic domain model problem (Q6). Getters and setters everywhere means business logic has nowhere to live except in services, which then becomes a procedural codebase with objects used as data bags.

**Follow-up: But frameworks need setters — JPA, Jackson.**
They need *a* way to populate state, not public setters. JPA can use field access. Jackson can use constructor binding with `@JsonCreator`, or a separate DTO that maps to your domain object. The framework's needs are a serialisation concern; letting them dictate your domain model's API is the tail wagging the dog. Keeping a boundary DTO layer is a small cost that buys you a domain model you control.

---

### Q3. Composition over inheritance — why, and when is inheritance still right?

**Answer.** Inheritance is the strongest coupling in object-oriented design. The subclass depends on the superclass's *implementation*, not just its interface, so a change to a private method's behaviour in the parent can break a child that never referenced it. That's the fragile base class problem.

Concretely: `class Stack extends ArrayList` gives Stack every ArrayList method, including `add(int, E)`, which lets a caller insert into the middle of a stack. You've inherited an API you didn't want and can't remove.

Composition — holding a reference and delegating — gives you the reuse without the coupling. You expose only what you choose, you can swap the delegate at runtime, and you can hold several.

Inheritance is still right when there's a genuine *is-a* relationship with substitutability (Q17), the hierarchy is shallow and stable, and you control both sides. Template Method is the legitimate case: a fixed algorithm with designated variation points, in a class explicitly designed for extension.

**Follow-up: What did Josh Bloch mean by "design for inheritance or prohibit it"?**
A class that can be subclassed has a second, invisible API: which methods call which other methods, in what order, and which are safe to override. That's a contract you must document and then never change. Most classes aren't worth that commitment, so make them `final` — and note that `sealed` (Java 17) gives you a middle option: extensible, but only by types you name.

---

### Q4. Explain coupling and cohesion, and how you'd actually measure them.

**Answer.** **Cohesion** is how strongly the elements inside a module belong together. **Coupling** is how much modules depend on each other. You want high cohesion and low coupling, and the two are related — pulling unrelated things apart usually reduces coupling as a side effect.

Coupling has degrees, from worst to best: content coupling (reaching into another module's internals), common coupling (shared global state), control coupling (passing a flag that changes the callee's behaviour), stamp coupling (passing a whole object when you need one field), data coupling (passing exactly what's needed), and message coupling (calling a method, knowing nothing of the internals).

Measuring it in practice: **afferent coupling** (Ca — who depends on me) and **efferent coupling** (Ce — who I depend on), giving **instability** I = Ce/(Ca+Ce). A module with many dependents and few dependencies is stable and should be abstract; one with many dependencies and few dependents is unstable and should hold volatile detail. Tools like ArchUnit, JDepend, Structure101 and SonarQube compute these. The most useful signal is usually simpler: how many files does a typical change touch?

**Why it matters.** A lead uses these to make an argument concrete. "This is too coupled" is an opinion; "this class has 34 dependencies and every feature touches it" is evidence.

---

### Q5. What is the Law of Demeter and is it worth following?

**Answer.** "Only talk to your immediate friends" — a method should call methods on itself, its parameters, objects it creates, and its own fields. Not on objects returned by those.

```java
// train wreck — three levels of structural knowledge
order.getCustomer().getAddress().getCountry().getTaxRate();

// obeys it
order.taxRate();
```

The first version couples the caller to the entire object graph: change how address is stored, and every one of those call sites breaks. The second exposes an intention and hides the traversal.

Worth following as a *smell detector* rather than a rule. Chains through your own domain model are a real warning sign. Chains through fluent builders (`Stream.of(...).filter(...).map(...)`, `HttpRequest.newBuilder()...`) don't violate it in spirit at all, since each call returns the same conceptual object. Applying it dogmatically produces a wrapper method for everything, which is its own problem.

**Follow-up: How does this relate to "Tell, Don't Ask"?**
Same instinct. Instead of asking an object for its state and deciding what to do, tell it what you want and let it decide. `if (account.getBalance().compareTo(amount) >= 0) { account.setBalance(...) }` becomes `account.withdraw(amount)`. That's the move that pulls behaviour back into objects and out of services.

---

### Q6. What is an anemic domain model, and is it always wrong?

**Answer.** Objects with fields, getters and setters but no behaviour, with all the logic in service classes. Fowler named it as an anti-pattern because it looks object-oriented while being procedural: you've paid the price of objects (indirection, mapping, ceremony) and taken none of the benefit (invariants enforced in one place, behaviour near data).

The cost shows up as duplicated logic. The overdraft rule ends up in `TransferService`, `WithdrawalService` and `BatchPaymentJob`, and one of them is subtly different.

**But it's not always wrong.** For a CRUD application that genuinely just moves data between a form and a table, a rich domain model is over-engineering — you'd be adding a layer whose only behaviour is assignment. It's also a reasonable fit for pipeline-style processing, where data is transformed rather than governed, and it's the norm in functional designs where data and behaviour are deliberately separate.

**Why it matters.** The signal to look for: does this data have *invariants*? If the answer is "a payment can't be captured before it's authorised, and can't be captured for more than the authorised amount," you have rules, and they need an owner. If the answer is "it's a name and an email," you have data, and a record is fine.

---

### Q7. Entity vs value object — why does the distinction matter?

**Answer.** An **entity** has identity that persists through change: a Customer is the same customer after changing their name and address. Equality is by ID. A **value object** is defined entirely by its attributes: `Money(100, MYR)` is interchangeable with any other `Money(100, MYR)`. Equality is by value, and they should be immutable.

The practical consequences are large. Value objects can be freely shared, cached and passed around without defensive copying. They're where validation naturally lives — a `Money` that refuses to be constructed with a negative amount or an unknown currency means every downstream method can stop checking. And they eliminate whole classes of bug: `transfer(Money amount, AccountId from, AccountId to)` cannot have its arguments swapped, whereas `transfer(BigDecimal, String, String)` can and eventually will.

**Follow-up: How does this map to Java 21?**
`record` is close to a purpose-built value object type — immutable, value-based equality, compact constructor for validation. The caveats from the Java bank apply: it doesn't deep-copy, and it exposes its components as permanent API. Entities remain classes, because they need mutable state and identity-based equality.

---

### Q8. What is primitive obsession and why does it matter at scale?

**Answer.** Representing domain concepts with primitives and strings: an account ID as `String`, money as `BigDecimal`, an email as `String`, a currency as `String`.

Three costs. **Type safety** — nothing stops you passing a customer ID where an account ID is expected; both are strings, and the compiler is happy. **Validation scatter** — every method that takes an email string must validate it, or trust that someone else did. **No home for behaviour** — currency conversion, masking a card number, formatting an amount all end up in a static utility class.

Wrapping them fixes all three:

```java
public record AccountId(String value) {
    public AccountId {
        if (!value.matches("ACC-\\d{10}")) throw new IllegalArgumentException(value);
    }
}
```

Now the type system enforces what was previously a convention, and the validation happens exactly once — at construction.

**Follow-up: Isn't that a lot of ceremony?**
It was, before records. It's now three lines per concept, and the payoff scales with codebase size and team size. I'd apply it to identifiers, money, and anything with a validation rule — and not bother for a genuinely free-form string like a description.

---

### Q9. How do you handle nulls in a design?

**Answer.** Layered. **Prevent** at the boundary — validate inputs once at the edge (controller, message consumer) so the interior can assume non-null. **Express** absence in types — `Optional` as a return type for methods that legitimately may have no result, and nullability annotations (`@Nullable`/`@NonNull`) with static analysis so the compiler helps. **Design it away** — an empty collection instead of null, a Null Object instead of a null collaborator, a required constructor parameter instead of a settable field.

The Null Object pattern is worth knowing specifically: instead of `if (logger != null) logger.log(...)` scattered everywhere, supply a `NoOpLogger` that does nothing. The conditional disappears from every call site.

**Why it matters.** Hoare called the null reference his "billion-dollar mistake" because it makes every reference type secretly a union of the type and nothing, unchecked. The design response isn't null checks — it's arranging for null not to be representable in the first place.

**Follow-up: What about Kotlin?**
It moves this into the type system: `String` and `String?` are different types and the compiler enforces the difference. That's strictly better than annotations plus tooling, and it's a genuine argument for Kotlin on a new service. In Java, the closest you get is disciplined use of Optional at boundaries plus NullAway or similar in the build.

---

### Q10. What makes an interface well-designed?

**Answer.** Small, named for the role rather than the implementation, and stable. Specifically:

- **Named for the client's need**, not the provider. `PaymentAuthorizer` beats `StripeServiceInterface` — the name should survive replacing the implementation.
- **Minimal** — every method is one more thing every implementor must provide and every mock must stub (Q18, ISP).
- **No implementation leakage** — no method that only makes sense for one implementation, no checked exceptions specific to one technology (`SQLException` in a repository interface tells you the abstraction failed).
- **Cohesive** — the methods belong together and are likely to be used together.

The test I apply: could I write a second, genuinely different implementation without changing the interface? If the interface has one implementation and always will, it may be pure ceremony — which is a real and common problem in Java codebases.

**Follow-up: Should every class have an interface?**
No. The one-interface-per-class habit came from mocking frameworks that couldn't mock classes and from DI containers that needed proxies. Both limitations are gone. Add an interface when you have or genuinely anticipate multiple implementations, when you need to invert a dependency across an architectural boundary (Q53), or when it's a published extension point. Otherwise it's an extra file that makes navigation worse.

---

### Q11. What is the difference between an abstraction and an indirection?

**Answer.** An abstraction *removes* detail — it lets you reason about something without knowing how it works. An indirection just *moves* detail — you now have to look somewhere else to understand the same thing.

A `PaymentGateway` interface with `authorize`, `capture`, `refund` is an abstraction: I can reason about payment flow without knowing whether it's Stripe or an acquirer's SOAP API. A `UserServiceImpl` behind a `UserService` interface with identical methods and one implementation is an indirection: I've added a file and a hop, and I still need to open the impl to know anything.

**Why it matters.** "Every problem can be solved by adding a layer of indirection, except too many layers of indirection." Most over-engineered codebases are full of indirections mistaken for abstractions. The diagnostic question: *what does this let me not think about?* If the answer is nothing, delete it.

---

### Q12. How do you decide when to introduce an abstraction?

**Answer.** I lean towards waiting. The rule of three is a reasonable heuristic: the first time, write it directly; the second time, note the duplication; the third time, you have enough information to see what actually varies and abstract along the right axis.

The failure mode of abstracting early is picking the wrong seam. You have one example, you guess at the general case, and you build an abstraction that fits one shape. The second use case doesn't fit, so you add a boolean parameter, then another, and now you have an abstraction that's harder to understand than the duplication it replaced. Removing a bad abstraction is much harder than removing duplication, because everything now depends on it.

Exceptions where I'd abstract early: at a genuine architectural boundary (external system, persistence), where I already know a second implementation is coming (a second payment provider on the roadmap), and where the cost of retrofitting is very high.

**Follow-up: What's "the wrong abstraction is worse than duplication"?**
Sandi Metz's point. Duplication is cheap to find and cheap to fix. A wrong abstraction has been depended upon by twenty call sites, each of which passed a slightly different flag to make it fit, and untangling it means understanding all twenty. Prefer to inline a bad abstraction back to duplication and re-abstract, rather than adding a parameter.

---

### Q13. What is design by contract?

**Answer.** Each method has **preconditions** (what the caller must guarantee), **postconditions** (what the method guarantees in return), and the class has **invariants** (what's always true between calls). Making these explicit turns "it broke somewhere" into "the caller violated this precondition".

In Java there's no language support, so it's expressed by: `Objects.requireNonNull` and guard clauses for preconditions, throwing meaningful exceptions rather than returning nulls, `assert` for internal invariants in development, and — most importantly — documentation on any non-obvious contract.

**Why it matters.** It's the formal basis of Liskov substitution (Q17): a subtype may **weaken** preconditions (accept more) and **strengthen** postconditions (promise more), never the reverse. That gives you a precise test for whether an override is legitimate, replacing intuition with a rule.

---

### Q14. What is the difference between essential and accidental complexity?

**Answer.** Fred Brooks's distinction. **Essential** complexity is inherent in the problem: payments genuinely involve multiple currencies, regulatory rules, partial failures, reconciliation and reversal. No design removes it — you can only move it. **Accidental** complexity comes from our tools and choices: framework ceremony, a distributed system where a monolith would do, five layers of indirection, a build that takes forty minutes.

**Why it matters.** It's the sharpest tool for evaluating an architecture. When someone proposes a change, ask which kind of complexity it addresses. Microservices, for example, don't reduce essential complexity at all — they redistribute it and add a substantial amount of accidental complexity (network, deployment, observability, data consistency) in exchange for organisational scalability. That can be a good trade. It's a bad one if you took it for the wrong reason.

**Follow-up: How do you use this in an architecture review?**
Ask: what problem does this solve, is that problem essential, and what accidental complexity are we buying? A proposal that can't articulate the essential problem it addresses is usually resume-driven or fashion-driven, and naming that dynamic — carefully — is part of the job.

---

## 2. SOLID & Design Principles

### Q15. Explain the Single Responsibility Principle. What does "one reason to change" actually mean?

**Answer.** The common reading — "a class should do one thing" — is unhelpful, because "one thing" has no fixed granularity. Uncle Bob's later formulation is the useful one: **a module should be responsible to one, and only one, actor**.

So the question isn't "does this class do too much?" but "who requests changes to it?" A `Payment` class with `calculateFee()`, `save()` and `toPdf()` serves three different actors: finance (fee rules), the DBA (schema), and the reporting team (document format). Each will request changes independently, and each change risks breaking the others' code because they share a file.

**Why it matters.** Framing it by actor makes it decidable. It also explains why SRP isn't about line count — a 500-line class serving one actor may be fine, while a 40-line class serving three isn't.

**Follow-up: Doesn't SRP lead to hundreds of tiny classes?**
Applied without judgement, yes — and that's a real failure mode. A codebase of 300 single-method classes has traded one kind of complexity for another; you can no longer see a whole use case in one place. My check: after splitting, is the *system* easier to change, or just each class? If a typical feature now touches nine files, the split was along the wrong axis.

**Follow-up: How does SRP interact with cohesion?**
They're two views of the same idea. SRP says split things that change for different reasons; cohesion says keep together things that belong together. The failure mode of over-applying SRP is low cohesion — related logic scattered across many classes, which is exactly what the Common Closure Principle warns against.

---

### Q16. Explain the Open/Closed Principle, and its cost.

**Answer.** Open for extension, closed for modification: you should be able to add behaviour without editing existing, tested code. The mechanism is polymorphism — define an abstraction, and add new implementations rather than adding branches to a switch.

```java
// closed to extension: every new type edits this method
if (type == CARD) { ... } else if (type == FPX) { ... }

// open: add a new PaymentMethod implementation, touch nothing existing
interface PaymentMethod { AuthResult authorize(Money amount); }
```

**The cost, which is usually understated:** OCP requires you to predict the axis of variation correctly. You've made the code open along *one* dimension and, in doing so, made it *harder* to change along others. If new payment methods arrive frequently, this is right. If instead the change is "every method now needs a 3-D Secure step", you must edit every implementation — the design is closed against exactly the change you got.

**Why it matters.** OCP is not free extensibility, it's a bet on which dimension will vary. Making that bet explicitly, based on what has actually changed historically, is the senior version of applying it.

**Follow-up: Does pattern matching on sealed types violate OCP?**
It inverts it deliberately. A sealed hierarchy is *closed* to new types and open to new operations; polymorphism is open to new types and closed to new operations. That's the expression problem, and Java 21 now supports both sides. Choose by which axis actually varies: an open set of payment providers wants polymorphism; a closed set of event types with an ever-growing set of handlers wants sealed types and pattern matching.

---

### Q17. Explain Liskov Substitution with a real violation.

**Answer.** Subtypes must be substitutable for their base type without breaking correctness. Formally (Q13): a subtype may weaken preconditions, strengthen postconditions, and must preserve the base type's invariants.

The classic textbook case is Square extends Rectangle: `setWidth` on a Square must also change the height to preserve squareness, which breaks any client that assumes `setWidth(5); setHeight(4);` yields area 20. The subtype strengthened an invariant the base type didn't have.

The version you actually meet:

```java
List<String> list = List.of("a", "b");
list.add("c");        // UnsupportedOperationException
```

`List.of` returns a `List` that violates the `List` contract — it strengthens the precondition on `add` to "never". The JDK does this knowingly, and it's why `Collections.unmodifiableList` surprises people. Another: a `ReadOnlyRepository` that extends `Repository` and throws on `save`.

**Why it matters.** LSP violations produce bugs at a distance — code that works with the base type breaks with one specific subtype, often in production and often far from where the subtype was chosen. And the fix is usually not in the subtype: it's that the hierarchy is wrong. Split the interface instead (which is ISP doing LSP's work).

**Follow-up: How do you detect violations?**
Run the base type's test suite against every subtype — if a subtype needs different tests for the same method, that's the smell. Also: any override that throws `UnsupportedOperationException`, checks `instanceof` on the subtype in client code, or documents "don't call this on X" is a violation announcing itself.

---

### Q18. Explain the Interface Segregation Principle.

**Answer.** Clients shouldn't be forced to depend on methods they don't use. A fat interface means every implementor implements methods it doesn't need (usually by throwing), every mock stubs methods irrelevant to the test, and a change to any method recompiles and potentially breaks every client.

The classic fix is role interfaces: instead of one `Repository` with 20 methods, have `ReadOnlyOrders`, `OrderWriter`, `OrderSearch`, and let a single class implement several. Clients depend on the narrow role they need.

**Why it matters.** ISP is really about *coupling to a contract you don't use*. It's also a leading indicator: when a class implements an interface by throwing on half the methods, you have an LSP violation caused by an ISP violation. The two principles interlock.

**Follow-up: Where does ISP show up in real Java code?**
Spring Data repositories are a good example done well — `CrudRepository`, `PagingAndSortingRepository`, `JpaRepository` are layered so you extend only what you need. A good counter-example is the older Servlet API's `HttpServlet`, where you extend and override the two methods you want and inherit a dozen you don't.

---

### Q19. Explain the Dependency Inversion Principle, and how it differs from dependency injection.

**Answer.** DIP: high-level modules shouldn't depend on low-level modules; both should depend on abstractions. And — the half people forget — **abstractions shouldn't depend on details; details should depend on abstractions**.

The second half is the whole point, and it's about *who owns the interface*. If `OrderService` depends on a `PaymentGateway` interface that lives in the payment infrastructure package, you haven't inverted anything — the dependency arrow still points from your domain to infrastructure. Real inversion means the interface is defined in the **domain**, expressed in the domain's language, and the infrastructure implements it. Now the arrow points inward, and you can delete the Stripe adapter without touching the domain.

**DIP vs DI vs IoC:**
- **DIP** is a design principle about the direction of dependencies.
- **Dependency injection** is a technique for supplying dependencies from outside — you can do DI while completely violating DIP, by injecting a concrete `StripeClient` into your domain service.
- **Inversion of Control** is the broader idea that the framework calls you rather than you calling it.

Being able to separate these three is a strong senior signal, because most people use them interchangeably.

**Why it matters.** DIP is the mechanism behind hexagonal architecture (Q53) — the ports are domain-owned interfaces, the adapters are the details that depend on them.

---

### Q20. Where do the SOLID principles conflict with each other?

**Answer.** Frequently, and knowing where is more useful than knowing the definitions.

- **SRP vs cohesion/locality.** Splitting by actor scatters a use case across files. Taken far enough, you can't read a feature without opening nine classes. SRP optimises for independent change; locality optimises for comprehension. They trade off.
- **OCP vs YAGNI.** OCP asks for an extension point; YAGNI says don't build it until you need it. Building extension points speculatively is one of the most common forms of over-engineering.
- **ISP vs simplicity.** Segregating aggressively yields many tiny interfaces and more files, more names, more indirection.
- **DIP vs directness.** Every inversion adds a layer. Inverting a dependency on something that will never be replaced (your logging library, say) is pure cost.
- **OCP vs SRP.** Making a class extensible often means adding abstraction *inside* it, which can pull in responsibilities.

**Why it matters.** SOLID is a set of heuristics with costs, not laws. The interviewer is checking whether you'd apply them mechanically or weigh them. My general resolution: favour the principle that addresses a problem you can *demonstrate*, and prefer the simpler design when the argument is speculative.

---

### Q21. What are the criticisms of SOLID, and are they fair?

**Answer.** Several are fair and worth being able to state.

- **Vague and unfalsifiable.** "One reason to change" and "one thing" are subjective enough that any design can be argued to comply. The actor-based reformulation helps but doesn't remove it.
- **Optimised for a specific era.** SOLID was formulated around large statically-typed OO codebases with expensive recompilation and no first-class functions. Several of its mechanisms (Strategy classes, Abstract Factory) are one-line lambdas today.
- **Encourages indirection.** In practice, teams applying SOLID enthusiastically produce codebases with many small classes, many interfaces with one implementation, and low readability. Dan North's "CUPID" and "write simple code" critiques target exactly this.
- **Silent on the things that matter most now** — concurrency, data flow, failure handling, distribution.

**My position:** the underlying instincts are sound and worth internalising — separate things that change separately, depend on contracts not implementations, don't force clients to know what they don't need. The named five are a teaching device, not a design method, and a senior engineer should be able to critique them as well as apply them.

**Follow-up: What would you teach a team instead?**
The same instincts, framed around change: what has actually changed in this codebase over the last year, and does the design make that kind of change cheap? That's empirical, team-specific, and immediately actionable — whereas "is this SRP-compliant?" generates debate without evidence.

---

### Q22. DRY is frequently misapplied. Explain.

**Answer.** DRY is about *knowledge*, not text. Its actual formulation is "every piece of knowledge must have a single, unambiguous, authoritative representation within a system." Two code fragments that look identical but represent different knowledge are **not** duplication, and merging them creates coupling between things that should vary independently.

The failure mode: a `Customer` DTO and a `Customer` entity have the same fields, so someone merges them. Now the API contract and the database schema are the same class, and you cannot change one without changing the other. That's the opposite of what DRY is for.

The counter-heuristics: **WET** (write everything twice — wait for the third occurrence), and **AHA** (avoid hasty abstractions, Kent C. Dodds) — prefer duplication over the wrong abstraction (Q12).

**Why it matters.** Over-applied DRY is one of the top causes of accidental coupling in large codebases, particularly the shared-library problem in microservices (Q66). The question to ask before deduplicating: *if this changes for one caller, should it change for all of them?* If the answer is no, it isn't duplication.

---

### Q23. YAGNI versus designing for change — how do you reconcile them?

**Answer.** By separating *reversible* from *irreversible* decisions.

For reversible decisions — how a class is structured, whether there's an interface, which pattern is used — apply YAGNI hard. The cost of getting it wrong is a refactor, and refactoring is what we're good at. Speculative flexibility here is nearly always wasted, because you guess the wrong axis (Q16).

For irreversible or expensive-to-reverse decisions — the data model, the public API contract, the service boundary, the choice of persistence, whether you can identify a tenant on every request — think hard up front. These are the ones where "we'll change it later" means a migration project.

**Why it matters.** YAGNI applied indiscriminately produces systems where the database has no tenant column and adding multi-tenancy is a year of work. The skill isn't choosing between the two principles, it's classifying the decision correctly.

**Follow-up: What's a cheap way to preserve optionality without building it?**
Design the *seam* without the implementation: keep the boundary clean and the dependency inverted, so a future implementation can be slotted in. That costs one interface, not a plugin framework. And write down in an ADR (Q57) what you deliberately didn't build and what would trigger revisiting it.

---

### Q24. What are the package/component design principles?

**Answer.** Less famous than SOLID and more directly useful for module and service boundaries. Cohesion:

- **REP** (Release/Reuse Equivalence) — the unit of reuse is the unit of release. If you want people to reuse it, version and release it.
- **CCP** (Common Closure) — classes that change together belong together. This is SRP at package level, and it's the strongest guide for drawing module boundaries.
- **CRP** (Common Reuse) — classes used together belong together; don't force a consumer to depend on things it doesn't use. ISP at package level.

Coupling:

- **ADP** (Acyclic Dependencies) — no cycles in the package dependency graph. Cycles make independent build, test and deploy impossible.
- **SDP** (Stable Dependencies) — depend in the direction of stability.
- **SAP** (Stable Abstractions) — stable packages should be abstract, so they can be extended without modification.

**Why it matters.** These transfer directly to microservices: CCP is the argument for decomposing by business capability rather than technical layer (Q63), ADP is why circular service dependencies are a distributed-monolith smell (Q65), and SDP explains why shared libraries must be more stable than their consumers.

**Follow-up: How do you enforce ADP?**
ArchUnit tests in the build. A test asserting "no cycles between top-level packages" and "the domain package depends on nothing outside itself" catches architectural erosion at PR time, which is the only time it's cheap to fix.

---

### Q25. What is a composition root, and why does it matter?

**Answer.** The single place in an application where the object graph is wired — where concrete implementations are chosen and injected. In Spring it's the configuration classes and component scanning; done manually, it's a factory method called from `main`.

The value is that dependency *resolution* is confined to one place, so the rest of the codebase never asks for its dependencies — it declares them in constructors and receives them. That's what keeps the code testable and framework-independent.

The anti-pattern it prevents is the **Service Locator**: a global registry that classes call to fetch dependencies (`ServiceLocator.get(PaymentGateway.class)`). It looks like DI but inverts the benefit — dependencies become invisible in the signature, tests need the locator populated, and you get runtime failures instead of compile-time or startup-time ones. Mark Seemann's "Service Locator is an anti-pattern" is the canonical argument.

**Follow-up: Isn't Spring's `ApplicationContext` a service locator?**
It can be used as one, and that's the misuse. Injecting `ApplicationContext` and calling `getBean()` is service location. Letting Spring inject constructor arguments is dependency injection, with the context acting as the composition root. The distinction is whether the class knows about the container.

---

### Q26. If you could only teach a team three design principles, which?

**Answer.**

1. **Make the change easy, then make the easy change** (Kent Beck). It reframes design as something you do continuously in response to real requirements, rather than up front against imagined ones. It also gives a natural home for refactoring in the workflow.
2. **Depend on contracts, not implementations** — the DIP instinct, without the vocabulary. It's the one principle that buys the most: testability, replaceability, and the ability to reason about a module in isolation.
3. **Optimise for deletion.** Code that's easy to delete is loosely coupled, well-bounded and honest about its dependencies, almost by definition. And in a long-lived codebase you will delete far more than you predict.

**Why it matters.** The question tests whether you can prioritise, and whether your principles are things you'd actually use in a review. Naming Beck's line rather than a SOLID letter also signals that you've read past the standard curriculum.

---

## 3. Design Patterns

### Q27. What are design patterns for, and what's the main way people misuse them?

**Answer.** They're a shared vocabulary for recurring solutions. The main value is communication: saying "put a Strategy here" conveys a whole design in two words to anyone who knows the catalogue.

The main misuse is treating them as goals. Patterns are *discovered* by refactoring towards a problem, not applied in advance because a design should have patterns in it. A codebase where every class is named `XFactory`, `YStrategy`, `ZVisitor` usually has more indirection than domain.

The second misuse is not noticing that the language has absorbed them. In modern Java, Strategy is a lambda, Iterator is `for-each`, Singleton is a Spring bean, Command is a `Runnable`, Observer is a listener list or a reactive stream, Template Method is often better as a higher-order function. Implementing the 1994 class-based version of these is usually wrong now.

**Why it matters.** The interviewer wants to see whether you can name patterns *and* judge when not to use them. "I'd use the Visitor pattern" is a fine answer for a stable data structure with growing operations, and a poor answer in Java 21, where sealed types plus pattern matching give you the same thing with far less machinery.

---

### Q28. Factory Method vs Abstract Factory vs a static factory method.

**Answer.**
- **Static factory method** — not a GoF pattern; just a named static method instead of a constructor. Benefits: a meaningful name (`Money.ofMinor(1000, MYR)`), the ability to return a cached instance or a subtype, and no requirement to create a new object. This is the one you'll use most; `List.of`, `Optional.of`, `Integer.valueOf` are all examples.
- **Factory Method** — a method on a class, overridden by subclasses to decide which concrete product to create. The creation decision is bound to the subclass.
- **Abstract Factory** — an object that creates *families* of related products, so all products come from one consistent family. The example that justifies it: a `ReportRenderer` factory producing matched `HeaderRenderer`, `TableRenderer` and `FooterRenderer` for PDF or for HTML, where mixing families would be wrong.

**Why it matters.** Abstract Factory is heavily over-applied. Its distinguishing requirement is *families of products that must be consistent with each other*. If you only ever create one kind of thing, you want a static factory or a simple `Supplier<T>`, not a factory hierarchy.

**Follow-up: What replaces these in modern Java?**
A `Supplier<T>` or a `Function<Config, T>` covers most Factory Method uses. Dependency injection covers most Abstract Factory uses — you configure which implementations are wired, once, in the composition root, which is exactly the "consistent family" job.

---

### Q29. When is the Builder pattern the right answer?

**Answer.** When an object has many parameters, several optional, and you want it immutable. It solves the telescoping-constructor problem and the "which of these six booleans is which" problem in one move:

```java
Payment.builder()
    .amount(Money.of(100, MYR))
    .reference("INV-2026-0042")
    .capture(false)
    .build();                     // validate invariants here
```

Crucially, `build()` is where you validate cross-field invariants — "capture requires an authorised amount", "a scheduled payment needs a future date" — which a constructor can also do but a setter-based approach cannot.

**Why it matters.** The alternative in modern Java is a record with a compact constructor, which is better when the parameter count is small and all fields are required. Builders earn their place at roughly five-plus parameters, or when optionality and defaults matter.

**Follow-up: What are the downsides?**
Verbosity (mitigated by Lombok's `@Builder`, at the cost of a bytecode-manipulating dependency), no compile-time check that required fields were set — `build()` fails at runtime — and a mutable builder that can be misused across threads. The staged/step builder variant recovers compile-time safety for required fields at the cost of more interfaces.

---

### Q30. Singleton — why is it considered an anti-pattern?

**Answer.** The pattern itself is fine; the classic *implementation* is the problem. A static singleton is global mutable state, which means: hidden dependencies (a class using it has a dependency invisible in its signature), untestable code (you can't substitute it, and state leaks between tests), thread-safety hazards, and lifecycle you don't control.

It also conflates two concerns that should be separate: "there should be one instance" and "everyone can reach it globally." The first is a legitimate requirement; the second is the damage.

The correct modern approach: let the DI container manage a single instance and inject it. You get one instance, an explicit dependency, and full substitutability in tests. That's a singleton *scope*, not a Singleton *pattern*.

**Follow-up: If you must implement one without a container?**
Enum singleton (serialization-safe, thread-safe, concise) or the holder idiom (Q14 in the Java bank). And keep it stateless if at all possible — a stateless singleton is much less harmful, because most of the damage comes from the shared mutable state, not from the singularity.

---

### Q31. Explain Adapter, Facade and Proxy — they're often confused.

**Answer.** All three wrap something, with different intent:

- **Adapter** — converts one interface into another so incompatible things can work together. Intent: compatibility. `Arrays.asList` adapts an array to a List; an anti-corruption layer (Q50) is an adapter at architectural scale.
- **Facade** — provides a simpler interface over a complex subsystem. Intent: simplification. It doesn't change the interface of one thing; it hides several things behind one.
- **Proxy** — provides the *same* interface as the target, controlling access to it. Intent: control. Variants: virtual (lazy loading — a Hibernate lazy proxy), protection (security checks), remote (RPC stub), smart (caching, reference counting). Spring's `@Transactional` is a proxy.

**Why it matters.** The distinguishing question is *what does the wrapper's interface look like compared to the target's?* Different interface → Adapter. Simpler interface over many things → Facade. Same interface → Proxy. Same interface with added behaviour → Decorator (Q32).

---

### Q32. Decorator vs inheritance — when do you reach for it?

**Answer.** Decorator adds behaviour by wrapping an object with the same interface, so behaviour composes at runtime rather than being fixed at compile time. `java.io` is the canonical example: `new BufferedReader(new InputStreamReader(new FileInputStream(f)))` — buffering, decoding and file access composed independently.

It beats inheritance when the behaviours are orthogonal and combinable. With inheritance you'd need a subclass per combination: `BufferedFileReader`, `CompressedBufferedFileReader`, `EncryptedCompressedBufferedFileReader` — a combinatorial explosion. With decorators you need N classes for N behaviours and compose them freely.

**Why it matters.** It's a concrete demonstration of composition over inheritance (Q3) with a measurable payoff — 2^N classes becomes N.

**Follow-up: What are the downsides?**
Debugging through five layers of wrapper is unpleasant, and stack traces get deep. Identity is surprising — the decorated object is not `equals` to the target, which breaks code that relies on identity. And `java.io`'s API is widely cited as an example of decorators making a simple task (read a file) require knowing three classes.

---

### Q33. Strategy pattern — is it still relevant in Java 21?

**Answer.** The intent is: encapsulate interchangeable algorithms and select one at runtime. Absolutely still relevant — but the *implementation* has changed.

The 1994 form is an interface plus a class per algorithm plus a factory. In modern Java, if the strategy is a single function, it's a lambda or a method reference:

```java
Map<PaymentType, FeeCalculator> calculators = Map.of(
    CARD, amount -> amount.multiply(0.029).plus(cents(30)),
    FPX,  amount -> cents(100)
);
```

The class-based form is still right when the strategy has multiple methods, needs its own state or dependencies, or benefits from being a Spring bean (injected, testable, discoverable). In a fintech context, a fee strategy that needs a rates repository and an audit logger is a class; one that's arithmetic is a lambda.

**Follow-up: How does Spring make this easy?**
Inject `Map<String, FeeCalculator>` or `List<FeeCalculator>` and Spring populates it with every implementation, keyed by bean name. Adding a new strategy is adding a class — no registration, no factory edit. That's OCP with framework support, and it's one of the genuinely elegant Spring idioms.

---

### Q34. Template Method — where does it still belong?

**Answer.** A base class defines the skeleton of an algorithm and defers specific steps to subclasses. It's the legitimate use of inheritance (Q3): a fixed sequence with designated variation points.

```java
abstract class SettlementJob {
    public final void run() {        // final: the sequence is not overridable
        var batch = load();
        validate(batch);
        var result = process(batch);  // abstract — the variation point
        report(result);
    }
    protected abstract Result process(Batch b);
}
```

Marking `run()` final is the important detail — the whole point is that the sequence is invariant.

**Why it matters.** The functional alternative is passing the varying step as a parameter (a higher-order function), which avoids inheritance entirely and lets you compose steps at runtime. I'd prefer that unless there are several variation points with shared state, where the class form reads better.

**Follow-up: What's the danger?**
The fragile base class problem, and the fact that adding a variation point later changes the contract for every existing subclass. Also, a template method calling an overridable method from a constructor is the initialisation-order bug from Q8 in the Java bank.

---

### Q35. Observer pattern and its modern replacements.

**Answer.** One-to-many notification: subjects publish, observers subscribe. The hand-rolled form (a `List<Listener>` and a `notifyAll` loop) is still common and still has three well-known problems: **memory leaks** if listeners never deregister (Q14 in the Java bank), **unbounded synchronous execution** — one slow listener blocks the publisher and one throwing listener can break the loop for the rest — and **no backpressure**.

Modern replacements, in order of scale: Spring's `ApplicationEventPublisher` for in-process decoupling (with `@TransactionalEventListener` to fire only after commit, which is genuinely useful); reactive streams (`Flux`) when you need backpressure and composition; and a message broker when the observers are other services.

**Why it matters.** The step from in-process events to a broker is exactly where the dual-write problem appears (Q136 in the data bank), so "we'll just publish an event" has very different implications inside a process and across one.

**Follow-up: What's the transactional event trap?**
Publishing an event inside a transaction and having a listener act on it *before* commit, so the listener sees state that may roll back. `@TransactionalEventListener(phase = AFTER_COMMIT)` fixes the in-process case. Across services, the outbox pattern is the fix.

---

### Q36. When would you use the State pattern?

**Answer.** When an object's behaviour changes with its state and the conditional logic is spreading. Each state becomes a class implementing a common interface, and transitions are explicit.

The fintech case is compelling: a payment moves through Pending → Authorised → Captured → Settled, with Failed and Refunded branches. Without the pattern, every method starts with a switch on status and the legal transitions are implicit in scattered `if`s. With it, `AuthorisedPayment.capture()` is valid and `PendingPayment.capture()` throws — the state machine is in the type system.

**Why it matters.** It makes illegal transitions *unrepresentable* rather than merely checked, which is the same instinct as value objects (Q7).

**Follow-up: What's the Java 21 alternative?**
A sealed interface with a record per state and pattern matching on transitions. You get exhaustiveness checking from the compiler — add a state and every transition function fails to compile until you handle it — which the class-based State pattern doesn't give you. For a state machine with a fixed set of states, that's strictly better. For very complex machines, a dedicated state machine library with a declarative transition table is more maintainable than either.

---

### Q37. Explain the Command pattern and where you've seen it.

**Answer.** Encapsulate a request as an object, so it can be queued, logged, retried, undone, or executed by a different thread. The essential move is turning a method call into data.

Where it appears: `Runnable`/`Callable` submitted to an executor is Command; a job row in a database queue (Q29 in the data bank) is a serialised Command; every message in a message broker is one; undo/redo stacks in editors; and CQRS commands.

**Why it matters.** The pattern's value is *reification* — once a request is an object, you can do things to it that you can't do to a method call: persist it, ship it across a network, retry it, audit it, replay it. That's the conceptual bridge between OO design and event-driven architecture, and it's worth being able to make explicitly.

**Follow-up: Command vs event?**
A command is an instruction to do something, addressed to a specific handler, and it can be rejected (`CapturePayment`). An event is a statement that something happened, in the past tense, broadcast to whoever cares, and cannot be rejected (`PaymentCaptured`). Confusing them produces topics full of commands that three services all try to handle. Naming discipline — imperative for commands, past tense for events — prevents a surprising amount of design confusion.

---

### Q38. Chain of Responsibility — where is it genuinely useful?

**Answer.** A request passes along a chain of handlers until one handles it (or all have had a look). It decouples the sender from knowing which handler will act.

Genuinely useful in: filter/middleware chains (servlet filters, Spring Security's filter chain, interceptors), validation pipelines where each rule can reject, approval workflows with escalating authority limits, and exception/fallback chains.

The fintech example: a payment routing chain where each handler decides whether it can process a given transaction — this acquirer handles MYR cards, that one handles FPX, a fallback handles the rest.

**Why it matters.** The pattern's risk is that it makes control flow implicit — you can't tell from the call site what will happen, and debugging means stepping through the chain. Keep the chain short, make its construction visible in one place, and log which handler acted.

---

### Q39. Visitor — and why Java 21 mostly replaces it.

**Answer.** Visitor separates an algorithm from the object structure it operates on, using double dispatch: each element has an `accept(Visitor)` that calls back `visitor.visitConcreteType(this)`. It's designed for a **stable set of types with a growing set of operations** — the classic case being an AST where you keep adding new passes.

The costs are notorious: every element class needs an `accept` method (so the data structure is polluted with the pattern), adding a new element type breaks every existing visitor, and the double dispatch makes the code hard to follow.

**Java 21 replaces it for most cases.** A sealed interface plus record patterns plus switch gives you the same capability — add operations freely without touching the types — with compile-time exhaustiveness and none of the machinery:

```java
sealed interface Expr permits Num, Add, Mul {}
double eval(Expr e) {
    return switch (e) {
        case Num(double v)         -> v;
        case Add(var l, var r)     -> eval(l) + eval(r);
        case Mul(var l, var r)     -> eval(l) * eval(r);
    };
}
```

**Why it matters.** Being able to say "Visitor was a workaround for the absence of pattern matching, and Java now has pattern matching" shows you understand *why* the pattern existed rather than just what it does.

---

### Q40. Repository pattern — what is it actually for?

**Answer.** A repository mediates between the domain and data mapping, presenting a collection-like interface for aggregates: `orders.findById(id)`, `orders.save(order)`. The domain expresses persistence in its own language and never sees SQL, JPA or a `ResultSet`.

The two real benefits: the domain is testable without a database, and persistence technology becomes a swappable detail (DIP — the interface lives in the domain, the implementation in infrastructure).

The common misuse is a repository per *table* rather than per *aggregate*, with 40 methods including `findByStatusAndCreatedAtBetweenOrderByAmountDesc`. At that point it isn't an abstraction, it's a thin veneer over a query language with worse ergonomics (Q11).

**Follow-up: Is Spring Data's repository a Repository?**
Partly. It gives you the interface and the implementation for free, which is excellent leverage. But `JpaRepository` exposes `flush`, `saveAll`, `getReferenceById` and pagination types — JPA concepts leaking into what should be a domain interface. If I care about the boundary, I define my own narrow domain interface and implement it *using* Spring Data, rather than extending `JpaRepository` in the domain layer.

**Follow-up: What about the Specification pattern?**
It encapsulates a query predicate as a domain object, so business rules like "overdue high-value invoices" are named, testable and composable rather than scattered as query strings. Spring Data supports it directly via `JpaSpecificationExecutor`. Useful when query logic is genuinely domain logic; over-engineering when it's just a filter.

---

### Q41. What are the most damaging anti-patterns you look for?

**Answer.**
- **God object / god service.** One class that everything depends on and every change touches. Detectable mechanically: file size, number of dependencies, and how often it appears in diffs.
- **Big Ball of Mud.** No discernible architecture; every module reaches into every other. Usually the result of no enforced boundaries (Q24 — ArchUnit would have prevented it).
- **Service Locator** (Q25) — hidden dependencies, runtime failures.
- **Anemic domain model** (Q6) with fat services.
- **Primitive obsession** (Q8).
- **Distributed monolith** (Q65) — the most expensive of all, because you pay microservice costs for monolith coupling.
- **Shotgun surgery** — one conceptual change requiring edits in fifteen files. This is the clearest signal that the boundaries are wrong.
- **Speculative generality** — abstractions, parameters and extension points built for requirements that never arrived.

**Why it matters.** The last two are the ones I'd emphasise, because they're *measurable*. Shotgun surgery shows up in commit statistics; speculative generality shows up as code paths with no callers. Making architectural problems measurable is how you get budget to fix them.

---

### Q42. How do you refactor towards a pattern safely?

**Answer.** Small steps, tests green throughout. The mechanics that make it safe:

1. **Characterisation tests first** if the code is untested — capture current behaviour, including the bugs, so you can tell refactoring from changing.
2. **Branch by abstraction** rather than a long-lived branch: introduce the abstraction, route through it, migrate implementations one at a time, remove the old path. Everything stays merged and deployable.
3. **Parallel run** for high-risk changes — execute both old and new paths, compare results, log divergence, and only then cut over. Standard practice for anything financial.
4. **One refactor per commit**, separate from behaviour changes, so review is possible and revert is surgical.

**Why it matters.** The failure mode is the six-week refactoring branch that never merges. Any technique that keeps the codebase releasable throughout is worth more than the elegance of the end state.

---

### Q43. Give an example of a pattern you removed rather than added.

**Answer.** (Have a real one. The shape that reads well:)

"We had an Abstract Factory producing a family of report renderers, built when we expected three output formats. Two years on there was still one format, and every new report type meant touching four interfaces and four implementations. I inlined it back to a single class with a method per section, deleted about 300 lines, and the next report took an afternoon instead of a day. The extension point had been a bet on an axis that never varied."

**Why it matters.** Interviewers hear "I applied pattern X" constantly. Deletion demonstrates judgement, willingness to revisit decisions, and the confidence to remove someone else's work — including your own. It's also honest about the fact that most speculative abstraction is wrong.

---

### Q44. How have functional features changed which patterns you use?

**Answer.** Several patterns collapse into a function:

| Pattern | Modern form |
|---|---|
| Strategy | Lambda / method reference |
| Command | `Runnable`, `Callable` |
| Template Method | Higher-order function taking the varying step |
| Factory Method | `Supplier<T>` |
| Iterator | `for-each`, `Stream` |
| Observer | Listener list, `Flux`, event publisher |
| Visitor | Sealed types + pattern matching |
| Decorator | Function composition (`f.andThen(g)`) for single-method cases |
| Chain of Responsibility | `Stream` of predicates, or composed functions |

What remains genuinely class-shaped: patterns with state (Builder, State with data), patterns with multiple methods (Adapter, Facade), and patterns where the object needs its own dependencies (a Strategy that needs a repository).

**Why it matters.** It shows you know the patterns as *solutions to problems* rather than as class diagrams. The problem (interchangeable algorithms) is eternal; the solution (an interface hierarchy) was a workaround for a language limitation.

---

### Q45. What's the difference between a pattern and an idiom?

**Answer.** A pattern is language-independent — Strategy exists in Java, Go and Haskell in different forms. An idiom is a language-specific convention: try-with-resources, the holder idiom for lazy singletons, the double-brace initialisation anti-idiom, `Optional` chaining, the builder-with-compact-constructor combination.

Worth distinguishing because idioms are where a lot of practical quality lives, and they're what code review actually enforces day to day. A team that knows Java's idioms will write better code than one that knows the GoF catalogue but writes C# in Java.

---

## 4. Domain-Driven Design

### Q46. What is DDD actually about, and what's the most common misunderstanding?

**Answer.** DDD is about making the *model* the shared asset between engineers and domain experts, so the code says what the business means. The misunderstanding is that DDD is a set of tactical patterns — entities, value objects, aggregates, repositories. Those are the least important part.

The important part is **strategic**: identifying bounded contexts, mapping the relationships between them, and establishing a ubiquitous language within each. Get the boundaries right and mediocre tactical design still works. Get the boundaries wrong and no amount of aggregate discipline saves you — which is exactly how teams end up with a distributed monolith.

**Why it matters.** Teams that adopt "DDD" by adding `@Entity`, `@ValueObject` and repository interfaces to an existing anemic model have adopted vocabulary, not DDD. The question that reveals whether it's real: *can a domain expert read your code's class and method names and recognise their own language?*

---

### Q47. What is a bounded context, and how do you find one?

**Answer.** A boundary within which a model and its language are consistent. "Customer" means something different to billing (a payer with a payment method and a credit limit), to support (a person with a ticket history), and to fraud (a risk profile with device fingerprints). A bounded context is the scope within which one definition holds.

Finding them: look for **linguistic seams** — the same word meaning different things, or different words meaning the same thing. Look at how the business is organised, because organisational boundaries usually reflect real ones (Conway's law, Q69). Run an **event storming** session: get domain experts to lay out domain events on a wall in time order, and the clusters and handoffs that emerge are strong candidates for context boundaries.

**Why it matters.** Bounded contexts are the single best guide to microservice boundaries (Q63). A service that spans two contexts will have a confused model; two services inside one context will be permanently chatty and change together.

**Follow-up: Isn't one shared canonical model simpler?**
It's the seductive wrong answer. A canonical `Customer` used by billing, support and fraud accumulates every field any context needs, means nothing precisely, and every change requires agreement across three teams. Bounded contexts accept translation cost at the boundary in exchange for models that are actually correct within each context.

---

### Q48. Explain aggregates and the rules around them.

**Answer.** An aggregate is a cluster of objects treated as one unit for data changes, with a single **aggregate root** as the only entry point. External code holds a reference to the root, never to internals.

The rules:
1. **The aggregate is the consistency boundary.** Its invariants are enforced within one transaction. An Order aggregate can guarantee "total equals the sum of line items" because it owns the lines.
2. **One transaction, one aggregate.** Changes spanning aggregates use eventual consistency (domain events, sagas), not a bigger transaction.
3. **Reference other aggregates by identity**, not by object reference. `Order` holds a `CustomerId`, not a `Customer`.

**Why it matters.** Rule 3 is the one that has the biggest practical effect, because it's what makes an aggregate loadable and savable as a unit — and it's the modelling rule that maps most directly onto service boundaries later. If your aggregates reference each other by ID, splitting them into services is mechanical. If they're a connected object graph, it's a rewrite.

**Follow-up: How big should an aggregate be?**
As small as the invariants allow. The pressure to make it large comes from wanting transactional consistency; the pressure to make it small comes from concurrency (a large aggregate is a lock contention point — every order line update contends on the order) and from load cost. Vaughn Vernon's guidance holds up: prefer small aggregates, and use eventual consistency between them. If two things must be immediately consistent, ask hard whether that's a real business requirement or an assumption.

---

### Q49. Domain event, integration event, application event — what's the difference?

**Answer.**
- **Domain event** — something meaningful happened in the domain, raised by an aggregate, consumed in the same bounded context. `PaymentAuthorised`. Its schema is internal; you can change it freely.
- **Integration event** — published to other contexts/services. Its schema is a **public contract**, versioned, and changing it breaks consumers.
- **Application event** — a technical in-process notification (cache invalidation, metrics) with no domain meaning.

**Why it matters.** Conflating the first two is a common and expensive mistake: publishing your internal domain events straight onto Kafka makes your internal model a public contract, and now every refactor is a breaking change for three other teams. The fix is an explicit translation step — the outbox row (Q136 in the data bank) holds the *integration* event, deliberately shaped, not the domain event.

**Follow-up: Where should the translation live?**
At the context boundary, owned by the publishing context. It's the outbound half of an anti-corruption layer: you decide what you're willing to promise externally, independently of how you model internally.

---

### Q50. What is an anti-corruption layer?

**Answer.** A translation layer between your bounded context and an external one, so their model doesn't leak into yours. The external system might be a legacy core banking platform, a third-party provider's API, or another team's service with a model you disagree with.

Without one, their concepts propagate: their field names, their status codes, their odd nullability, their notion of what a "transaction" is. Within six months your domain is shaped by their design and you can't change providers.

The implementation is unglamorous — an adapter (Q31) that maps their DTOs to your domain types and back, with the mapping logic isolated and tested. The value is that when they change, or you replace them, exactly one package changes.

**Why it matters.** In fintech you integrate with a lot of systems you don't control and whose models you'd never choose. The ACL is what keeps your domain yours. It's also the pattern that makes the strangler fig (Q68) work.

---

### Q51. Explain context mapping and the relationship patterns.

**Answer.** Context mapping documents how bounded contexts relate — both technically and organisationally:

- **Partnership** — two teams succeed or fail together; coordinated planning and releases.
- **Shared Kernel** — a shared subset of the model. Powerful and dangerous: any change needs agreement from both teams. Keep it tiny or avoid it.
- **Customer/Supplier** — downstream's needs influence upstream's priorities; there's a negotiation.
- **Conformist** — downstream simply adopts upstream's model, with no translation. Appropriate when you have no influence and the model is acceptable.
- **Anti-Corruption Layer** (Q50) — downstream translates to protect itself.
- **Open Host Service** — upstream publishes a well-defined protocol for many consumers.
- **Published Language** — a shared, documented interchange format (often with a schema registry).
- **Separate Ways** — no integration at all; sometimes duplicating is cheaper than integrating.

**Why it matters.** These are as much organisational descriptions as technical ones, and naming them makes an implicit power dynamic explicit. "We're a Conformist to the core banking team" says something true and useful about why your model looks the way it does, and starts a conversation about whether that's the right relationship.

---

### Q52. When is DDD the wrong choice?

**Answer.** When the domain isn't complex. A CRUD application, a reporting service, an integration shim, or a system whose rules are "store this and show it later" gains nothing from aggregates, domain events and a ubiquitous language — you'd be adding layers with no invariants to protect (Q6).

It's also wrong when you can't get access to domain experts. DDD's core mechanism is the conversation that produces the ubiquitous language. Without domain experts in the room, you get engineers inventing a model and calling it DDD, which is just architecture with more vocabulary.

And it's a poor fit under severe time pressure for a short-lived system.

**Why it matters.** DDD has a real cost — more classes, more mapping, more upfront modelling. It pays for itself when the domain has genuine complexity and the system will live for years. Saying so is a stronger answer than enthusiasm, because interviewers have all seen DDD cargo-culted into a CRUD app.

**Follow-up: Can you apply it partially?**
Yes, and you should. Use the strategic parts — bounded contexts, ubiquitous language, context mapping — almost always; they're cheap and they shape everything. Apply the tactical patterns only in the **core domain**, the part that differentiates the business. Supporting subdomains can be CRUD, and generic subdomains should be bought rather than built. That subdomain distinction is the most practical piece of DDD and the most often skipped.

---

## 5. Architectural Styles & Structure

### Q53. Compare layered, hexagonal, onion and clean architecture.

**Answer.** They're variations on one idea, with different diagrams.

**Layered** (controller → service → repository → database): simple, universally understood, and the dependency arrow points *downward towards the database*. The domain ends up depending on persistence, so the business rules can't be tested or reasoned about without it. That's the flaw the others address.

**Hexagonal / Ports & Adapters** (Cockburn): the application core defines **ports** (interfaces it owns), and **adapters** implement them. Driving adapters (HTTP, message consumer) call inbound ports; the core calls outbound ports implemented by driven adapters (database, payment provider). All dependencies point inward.

**Onion** (Palermo) and **Clean** (Martin) are essentially the same principle expressed as concentric circles, with the **dependency rule**: source code dependencies point only inward. Clean adds named layers (entities, use cases, interface adapters, frameworks).

**Why it matters.** The single shared insight is that **the domain should not depend on infrastructure** (DIP, Q19). Everything else is presentation. I'd use hexagonal vocabulary because ports/adapters is the clearest metaphor, and I wouldn't be dogmatic about the number of layers.

**Follow-up: What's the cost?**
Mapping. You'll have a domain model, a persistence model and an API model, with translation between them, and for a simple entity that's three classes and two mappers where one class would do. That's a genuine cost, and for a simple CRUD service it isn't worth it. It becomes worth it when the domain has real logic you want to test and evolve independently of the database.

---

### Q54. Package by layer or package by feature?

**Answer.** Package by feature, in almost all cases.

Package by layer (`controllers/`, `services/`, `repositories/`, `models/`) groups things that change for *different* reasons and separates things that change *together* — the exact inverse of the Common Closure Principle (Q24). Adding a field to Payment means editing four packages. It also makes everything public, since collaborating classes are in different packages, so there's no encapsulation at module level.

Package by feature (`payment/`, `refund/`, `settlement/`, each containing its own controller, service, repository and model) puts everything a change touches in one place. It allows package-private visibility, so a feature's internals are genuinely hidden. And it makes the codebase's *purpose* visible from the directory listing — "screaming architecture".

The strongest argument: a feature package is a candidate module, and a module is a candidate service. Package-by-feature is the on-ramp to a modular monolith and then, if needed, to extraction (Q67).

**Follow-up: How do you enforce it?**
ArchUnit rules: no feature package may depend on another feature package's internals — only on its published interface or on shared kernel packages. Run it in CI. Without enforcement, package-by-feature erodes back into a ball of mud within a year.

---

### Q55. What is a modular monolith, and why is it back in fashion?

**Answer.** A single deployable unit with strictly enforced internal module boundaries: modules communicate through published interfaces or in-process events, own their data (separate schemas or at minimum no cross-module foreign keys), and are prevented by build-time checks from reaching into each other.

It's popular again because the industry over-corrected into microservices and paid for it. A modular monolith gives you most of the *design* benefits — clear boundaries, independent reasoning, team ownership — with none of the distributed systems costs: no network partitions between modules, no eventual consistency where you didn't want it, transactions that actually work, one deployment, one log, one debugger.

And it preserves optionality. If a module genuinely needs independent scaling or an independent release cadence, extraction is tractable *because the boundary already exists*. Extracting from a ball of mud is not.

**Why it matters.** This is the answer I'd give to "should we use microservices?" for most teams under about 30 engineers. Being able to advocate for it credibly — rather than defaulting to microservices because that's the modern answer — is a strong seniority signal.

**Follow-up: What makes it fail?**
Boundaries that aren't enforced. Without ArchUnit or JPMS or a build-level check, someone will import across a boundary under deadline pressure, and the modularity is gone. The discipline has to be mechanical, because it will not survive being a convention.

---

### Q56. What is an architectural fitness function?

**Answer.** An automated, objective test of an architectural characteristic — from *Building Evolutionary Architectures*. If you care about a quality attribute, encode it as a test that fails the build.

Examples: ArchUnit rules asserting the dependency direction and the absence of package cycles; a performance test failing if p99 exceeds an SLO; a test asserting the service starts in under 10 seconds; a check that no new module exceeds a dependency count; a contract test verifying you haven't broken a consumer; a security scan failing on a new critical CVE.

**Why it matters.** Architecture documented in a wiki decays; architecture encoded in the build cannot. It converts "we agreed not to do that" from a norm requiring vigilance into a mechanism requiring nothing. For a lead, that's the difference between an architecture you maintain by policing PRs and one that maintains itself.

---

### Q57. What is an ADR and what makes a good one?

**Answer.** An Architecture Decision Record: a short document capturing one decision — the context and constraints at the time, the options considered, the decision, and the consequences accepted. Numbered, immutable once accepted, superseded rather than edited, stored in the repo next to the code.

What makes a good one: **honesty about the constraints** ("we had six weeks and no one on the team had operated Kafka"), **real alternatives** with why they were rejected, and **explicit consequences** including the bad ones. A one-paragraph ADR that says "we chose X because it's better" is worthless.

**Why it matters.** The value isn't the decision, it's preserving *what was known at the time*. Two years later, an engineer looking at a strange choice can see whether it was reasonable given the constraints or whether the constraints have since gone away. Without that, teams either cargo-cult past decisions or re-litigate them from scratch — both expensive.

**Follow-up: What should trigger writing one?**
Anything hard to reverse: choice of datastore, service boundaries, a public API contract, a framework, an auth model. Also anything where you had a genuine debate — the ADR is where the losing argument is preserved, which matters when circumstances change and the losing argument becomes the winning one.

---

### Q58. How do you evaluate an architecture against quality attributes?

**Answer.** Name the attributes that matter *for this system*, prioritise them explicitly (they conflict), and then evaluate designs against the top few — not against all of them, because a design that optimises everything optimises nothing.

For a payments platform I'd rank: correctness/consistency for the ledger, availability for the authorisation path, auditability, then latency, then cost, then developer velocity. That ranking immediately decides several arguments — it tells you the ledger gets synchronous replication and the analytics pipeline doesn't.

The technique for making it concrete is **scenarios**: not "the system should be scalable" but "at 5,000 TPS with one AZ lost, p99 authorisation latency stays under 300 ms and no acknowledged transaction is lost." That's testable, whereas "scalable" is not.

**Why it matters.** Most architecture disagreements are actually disagreements about priorities that nobody has stated. Surfacing the ranking usually resolves the argument without needing to win it.

---

### Q59. Event-driven architecture — what does it buy and what does it cost?

**Answer.** **Buys:** temporal decoupling (producer doesn't wait), consumer autonomy (add a consumer without touching the producer — this is the big one organisationally), natural buffering of load spikes, and an audit trail of what happened.

**Costs, all real:** eventual consistency becomes a user-facing concern; debugging spans systems with no stack trace; ordering is a design problem rather than a given; testing requires simulating asynchrony; duplicate delivery must be handled everywhere (Q137 in the data bank); and — the one people underestimate — you lose the ability to know what will happen when you publish an event, because the consumer list changes without you.

**Why it matters.** The trade is *coupling for comprehensibility*. Synchronous call chains are tightly coupled and easy to follow; event chains are loosely coupled and hard to follow. Choose per interaction, not per system: a payment authorisation is synchronous because the caller needs the answer; a notification is asynchronous because nobody's waiting.

**Follow-up: What's "event-carried state transfer"?**
Including enough state in the event that consumers don't need to call back for details. It removes a synchronous dependency, at the cost of larger events, duplicated data, and staleness. Worth it when the callback would be on a hot path; not worth it when the data is large or changes frequently after the event.

---

### Q60. Orchestration vs choreography.

**Answer.** **Choreography**: services react to each other's events with no central coordinator. Loosely coupled, easy to add participants, but the overall process exists nowhere — you reconstruct it by reading five codebases, and "why did this payment stall?" is genuinely hard.

**Orchestration**: a coordinator holds the process state machine and tells participants what to do. The process is explicit, observable, and testable; you can see where each instance is stuck and retry from a known point. The cost is a coordinator that can become a bottleneck or a god service, and participants that are slightly more coupled.

**My default:** choreography for two or three steps; orchestration beyond that, or whenever the process has business meaning worth observing. For a payment saga with authorisation, fraud check, capture and settlement, an orchestrator earns its place immediately, because operations will need to answer questions about in-flight processes.

**Why it matters.** The deciding question isn't coupling, it's **who owns the process**. If the process is a business concept that someone will ask questions about, it deserves an explicit home.

---

## 6. Microservices: Decomposition & Boundaries

### Q61. When should you *not* use microservices?

**Answer.** More often than people assume. The honest list:

- **Small team.** Below roughly 15–20 engineers, the coordination problem microservices solve doesn't exist yet, and you're paying the full operational cost for nothing.
- **Domain not understood.** Boundaries are the hardest thing to get right and the most expensive to change. Extracting a service across the wrong seam is far worse than a badly-factored module, because now the mistake is a network call and a data migration.
- **No platform maturity.** Microservices require CI/CD, containerisation, centralised logging, distributed tracing, service discovery, and on-call. Without those you've built a distributed system you can't observe.
- **Strong consistency requirements everywhere.** If most operations need atomic multi-entity updates, splitting them means sagas and compensations for everything — enormous complexity for no benefit.
- **Low scale.** If one server handles your load, distributing it adds latency, failure modes and cost.

**Why it matters.** Microservices are primarily an **organisational** solution — they let many teams deploy independently. They don't make code better, faster, or simpler; they make *teams* independent, at a substantial technical cost. Stating that clearly is the single strongest signal in this whole section.

**Follow-up: What would you do instead?**
A modular monolith (Q55) with enforced boundaries. You get the design discipline, you keep transactions and a single deployment, and the boundaries you establish become the extraction seams if and when you need them.

---

### Q62. "Monolith first" — do you agree?

**Answer.** Broadly yes, with a qualification. Fowler's argument is that you can't identify good boundaries until you understand the domain, and you understand the domain by building it. Starting with microservices means guessing boundaries at the moment of maximum ignorance, and boundary mistakes are the most expensive kind.

The qualification: "monolith first" is often heard as "don't think about boundaries yet", which is wrong. Build a monolith with *deliberate internal modularity* — module boundaries, no cross-module data access, in-process events at seams you suspect will become service boundaries. Then extraction is a mechanical exercise rather than an archaeology project.

The counter-argument worth acknowledging: if you're an experienced team building in a domain you know well, with a clear organisational structure, starting with a few well-understood services can be right. The failure isn't microservices — it's microservices chosen without evidence.

---

### Q63. How do you decide service boundaries?

**Answer.** By business capability or subdomain, never by technical layer. A "Payments" service that owns authorisation, capture and refund is a boundary; a "Data Access Service" and a "Business Logic Service" are layers pretending to be services, and every feature will touch both.

The signals I'd use:

1. **Bounded contexts** (Q47) — linguistic seams are the strongest evidence.
2. **What changes together** — CCP (Q24). If two things always appear in the same change, they belong in the same service.
3. **Team ownership** — a service should have one owning team (Q69). A service owned by two teams will have coordination overhead worse than a monolith.
4. **Data cohesion** — a service should own its data completely. If a boundary requires a distributed transaction on every operation, it's in the wrong place.
5. **Different rates of change or scale** — a fraud-scoring engine that changes daily and needs GPU capacity has a genuine reason to be separate from an account service that changes quarterly.

**Why it matters.** The test I apply: **can this service be deployed without coordinating with another team?** If not, the boundary is decorative — you have a distributed monolith (Q65).

---

### Q64. How big should a microservice be?

**Answer.** Size is the wrong metric, and "micro" is the most misleading word in the term. The right metrics:

- **One team can own it** — understand it fully, deploy it independently, and be on call for it.
- **It has one clear responsibility** expressible in a sentence without "and".
- **It can be rewritten in a few weeks** if necessary. Not that you would, but the constraint keeps it comprehensible.
- **It owns its data** and doesn't need another service's database to do its job.

Two-pizza-team is a heuristic about *ownership*, not lines of code. A service can legitimately be 50k lines if it encapsulates a genuinely complex domain; splitting it further would just distribute the complexity across a network.

**Why it matters.** The "smaller is better" instinct produces nanoservices — services so small that any real feature requires changing five of them, plus five deployments, plus five contract negotiations. That is strictly worse than a monolith.

---

### Q65. What is a distributed monolith and how do you recognise one?

**Answer.** Services that are physically separate but logically coupled — you get all the costs of distribution and none of the independence.

Symptoms, any one of which is diagnostic:
- Services must be **deployed together** or in a specific order.
- A typical feature requires changes in three or more services.
- Services share a database, or one reads another's tables.
- Synchronous call chains three or more deep — a request to A calls B calls C, so A's availability is the product of all three.
- A shared library that every service depends on, whose version bump requires a coordinated release.
- A change to one service's internal model breaks another.
- You can't test a service without running five others.

**Why it matters.** This is the most expensive failure mode in the whole space, because it's *worse than the monolith you started with*: same coupling, plus network latency, partial failure, distributed debugging and N deployments. Recognising it early — and being willing to say "we should merge these two services back" — is a genuinely senior act.

**Follow-up: What's the fix?**
Usually merging services back and re-splitting along a better seam, or replacing synchronous chains with asynchronous events to break the availability coupling. Both are unpopular because they look like going backwards. Framing it as "we're paying distribution costs without getting distribution benefits" is how you make the case.

---

### Q66. What's wrong with shared libraries in microservices, and what's the alternative?

**Answer.** A shared library reintroduces coupling at build time. A change to it requires every consumer to upgrade, so either everyone coordinates (destroying independent deployment) or you support many versions simultaneously (which is its own cost). And DRY instincts push people to put *domain* logic in shared libraries, which means the domain model is now shared across contexts — the canonical-model problem (Q47) with extra steps.

What's acceptable to share: genuinely generic technical utilities with stable APIs — logging configuration, tracing setup, an HTTP client wrapper, a serialisation helper. What isn't: domain models, DTOs shared between producer and consumer, business rules.

**The alternative for the DTO case**, which is what people usually want: publish a *schema* (Avro/Protobuf/OpenAPI) rather than a jar, and let each consumer generate its own types. The contract is shared; the code is not. That preserves independent evolution and gives you compatibility checking in CI (Q117 in the data bank).

**Follow-up: But now we duplicate the DTO in five services.**
Yes, deliberately. That's the DRY-is-about-knowledge point (Q22): each service's view of the payload is its own knowledge, and consumers legitimately care about different subsets. Duplication here buys independent deployability, which is the entire point of the architecture.

---

### Q67. How do you extract a service from a monolith?

**Answer.** Incrementally, keeping the system releasable throughout. The sequence I'd follow:

1. **Establish the module boundary inside the monolith first.** Move the code into one package, force all access through a single interface, and enforce it with ArchUnit. Nothing is distributed yet, and you've already got most of the design benefit.
2. **Separate the data.** Remove cross-boundary foreign keys and joins; replace them with calls to the module's interface. This is usually the hardest and longest step, and it's where extraction projects die. Do it before any network is involved.
3. **Branch by abstraction.** The interface now has two implementations: the in-process one and a remote one.
4. **Deploy the new service, dual-run.** Route a percentage of traffic (or shadow all of it) to the remote implementation, compare results, and keep the in-process path as the fallback.
5. **Cut over**, monitor, then delete the old code. Deleting is part of the work — an extraction that leaves the old path in place has doubled the maintenance surface.

**Why it matters.** Step 2 before step 3 is the crucial ordering. Teams that deploy the service first and untangle the data later end up with two services sharing a database, which is a distributed monolith with a migration project attached.

---

### Q68. Explain the strangler fig pattern.

**Answer.** Named for the vine that grows around a tree and eventually replaces it. You put a facade (usually an API gateway or a routing proxy) in front of the legacy system, then incrementally route individual capabilities to new implementations. The legacy system shrinks until it can be removed.

Why it beats a rewrite: value is delivered continuously rather than at the end; risk is spread across many small cutovers instead of one big-bang; each step is independently reversible; and you never have two systems to maintain in parallel for two years while the rewrite catches up on features the old system keeps adding.

The practical requirements: a routing layer capable of per-endpoint or per-customer routing; an anti-corruption layer (Q50) so the new code isn't shaped by the old model; and a data strategy — usually the hard part, since both systems may need the same data during transition (dual-write with reconciliation, or CDC-based synchronisation).

**Why it matters.** "We'll rewrite it" is the answer that has destroyed more projects than any other. Being able to describe a credible incremental alternative — with the data problem addressed, not hand-waved — is what makes the argument winnable.

---

### Q69. Conway's Law — how does it affect architecture?

**Answer.** "Organisations design systems that mirror their own communication structure." It's an observation, not advice, and it holds remarkably well: three teams building a compiler produce a three-pass compiler.

The consequence for architecture is that **you cannot impose an architecture that contradicts your org chart and expect it to survive**. If you draw four service boundaries and have two teams, the two teams will erode the boundaries, because coordinating across them within a team is free and enforcing them is friction.

The **Inverse Conway Manoeuvre** is the deliberate response: change team structure to produce the architecture you want. If you want independent services, you need teams that own them end-to-end. Team Topologies formalises this with stream-aligned teams (owning a slice of value), platform teams (reducing cognitive load for the others), enabling teams, and complicated-subsystem teams.

**Why it matters.** This is the point where technical leadership becomes organisational. A lead who proposes a service architecture without discussing team ownership has proposed half a design. It's also the honest answer to "why did our microservices fail?" — usually because the teams didn't change.

---

### Q70. How do you handle a change that spans several services?

**Answer.** First, treat it as a signal. If cross-service changes are common, the boundaries are wrong (Q65) and the real fix is boundary work, not better coordination.

For the changes that legitimately span services, the mechanism is **backward-compatible, staged rollout** — the same expand/contract discipline as a schema migration:

1. **Expand** — the provider adds the new capability alongside the old, supporting both.
2. **Migrate** — consumers move to the new one, independently, on their own schedule.
3. **Contract** — once telemetry shows zero use of the old path, the provider removes it.

Each step is a separate deployment by a single team with no coordination required. That's the whole point of the architecture, and any process that requires a synchronised release across teams has given it up.

**Follow-up: How do you know when the old path is unused?**
Instrument it. A counter per API version per consumer, and a dashboard. "We think nobody uses it" is how you break a partner integration; "no calls in 60 days from any client" is evidence. Deprecation headers (`Deprecation`, `Sunset`) and a published timeline do the rest.

---

### Q71. What is a bounded context versus a microservice?

**Answer.** A bounded context is a *design* boundary — a scope within which a model is consistent. A microservice is a *deployment* boundary. They're related but not identical.

A microservice should never span two bounded contexts (it would have a confused model), but a bounded context can legitimately contain several microservices — split for scaling, technology or team reasons within one consistent model. In practice, one context to one service is a good default, and deviating from it should have a stated reason.

**Why it matters.** People treat the two as synonyms, then conclude that DDD requires microservices. It doesn't — a modular monolith can have five bounded contexts. The context boundary is the valuable artefact; whether you deploy across it separately is a later, separate decision driven by organisational and operational needs.

---

### Q72. How do you decide what belongs in a shared platform versus in each service?

**Answer.** The test is **cognitive load**. A platform team's job is to reduce what each stream-aligned team must know, by providing paved-road capabilities: CI/CD pipelines, observability wiring, secret management, service templates, deployment tooling, a golden path for creating a new service.

What belongs in the platform: undifferentiated technical concerns that every service needs and none of them wants to think about. What doesn't: anything domain-specific, and anything the platform team would have to change every time a product team changes.

The critical constraint — from Team Topologies — is that the platform must be **optional and attractive**, not mandated. A platform teams choose to use is serving them; a platform they're forced to use becomes a bottleneck and the source of "we're blocked on platform" in every retro.

**Why it matters.** Getting this wrong recreates the centralised ops team that microservices were partly meant to escape, just with better branding.

---

### Q73. What are the real costs of microservices?

**Answer.** Worth being able to list concretely, because this is what candidates gloss over:

- **Network failure becomes a design concern** in every interaction — timeouts, retries, partial failure, cascading failure.
- **Distributed data.** No cross-service transactions; sagas, eventual consistency, and reconciliation for everything that spans services.
- **Observability is mandatory, not optional.** Without distributed tracing you cannot debug anything.
- **Testing is harder.** Integration testing needs many services or good contract testing discipline.
- **Operational surface.** N deployments, N sets of alerts, N on-call runbooks, N dependency upgrade streams, N sets of CVEs.
- **Latency.** An in-process call is nanoseconds; a network call is milliseconds. Chains multiply it.
- **Cost.** More instances, more idle capacity, more infrastructure, more egress.
- **Cognitive load.** Understanding a flow means reading several repositories.
- **Versioning and compatibility** as a permanent, ongoing tax.

**Why it matters.** The benefit — independent deployability and team autonomy — is singular and organisational. The costs are many and technical. Being able to state the asymmetry is what lets you make the decision honestly rather than by fashion.

---

### Q74. When would you merge two services back together?

**Answer.** When the evidence says the boundary is wrong:

- They're always deployed together.
- Most changes touch both.
- They're chattier with each other than with anyone else.
- They share data or need distributed transactions constantly.
- One is unavailable → the other is useless anyway, so the split bought no resilience.
- The same team owns both and there's no plan to change that.

**Why it matters.** Merging is culturally hard — it reads as failure, and someone's design is being undone. Framing matters: this isn't a retreat, it's responding to evidence that wasn't available when the boundary was drawn. A team that can merge services back has a healthier relationship with its architecture than one that can only add.

**Follow-up: How do you do it safely?**
The reverse of extraction: bring the code into one deployable as separate modules first, keeping the interface intact, then remove the network hop, then — only later, if it's genuinely correct — relax the module boundary. Do not merge the code and the data model in one step.

---

### Q75. How do you decide between synchronous and asynchronous communication?

**Answer.** By whether the caller needs the answer to proceed.

**Synchronous** when the result is required to respond to a user, when you need immediate validation or rejection, or when the operation is genuinely a query. Payment authorisation is synchronous — the cardholder is waiting.

**Asynchronous** when the caller doesn't need the outcome, when the work can tolerate delay, when you want the caller decoupled from the callee's availability, or when several consumers care about the same event. Sending a receipt, updating a search index, scoring for fraud after the fact, warehousing.

The decisive architectural consideration is **availability coupling**: a synchronous call means your availability is the product of yours and theirs, and a chain of three at 99.9% each gives 99.7%. Asynchronous communication breaks that multiplication — the consumer can be down and the message waits.

**Why it matters.** The instinct to make everything asynchronous "for decoupling" produces systems nobody can reason about (Q59). The instinct to make everything synchronous produces cascading failures. Choose per interaction, and be able to say why.

---

### Q76. REST, gRPC, GraphQL, messaging — how do you choose?

**Answer.**
- **REST/JSON** — ubiquitous, human-debuggable, cacheable by HTTP infrastructure, no tooling required. The right default for public APIs and most service-to-service calls. Costs: verbose, no schema by default (OpenAPI is bolted on), over/under-fetching.
- **gRPC** — schema-first with Protobuf, code generation, HTTP/2 multiplexing, streaming, much lower serialisation cost. Good for high-volume internal service-to-service. Costs: not human-readable on the wire, browser support needs a proxy, more tooling.
- **GraphQL** — client specifies the shape it wants, so it solves over-fetching for varied clients (mobile especially). Costs: complex server-side, caching is hard, N+1 resolvers are the default failure mode, and rate limiting by query cost rather than request count.
- **Messaging** — asynchronous, decoupled, multi-consumer, buffered. Costs: eventual consistency, ordering, duplicates (Q75).

**My defaults:** REST at the edge, gRPC between internal services when volume justifies it, messaging for events, GraphQL only when there's a real client-diversity problem — usually a BFF (Q78) solves the same problem with less machinery.

---

### Q77. What is an API gateway and what should it not do?

**Answer.** A single entry point in front of your services handling cross-cutting concerns: TLS termination, authentication, rate limiting, routing, request/response logging, and sometimes response aggregation.

The value is that these concerns are implemented once rather than in every service, and that clients see one endpoint rather than a changing internal topology.

**What it should not do:** business logic. The gateway is operated by a platform team and changed by many; putting domain rules there makes it a shared god service that every team must coordinate on to change — a bottleneck and a distributed monolith enabler. Aggregation is the borderline case: a little is fine, and once you're doing per-client orchestration you want a BFF instead.

**Follow-up: Gateway vs service mesh?**
The gateway handles **north-south** traffic (clients to services). A service mesh handles **east-west** traffic (service to service) — mTLS, retries, circuit breaking, load balancing, traffic shifting — via sidecar proxies, transparently to application code. They're complementary, and the mesh is only worth its operational cost at meaningful service count; below a dozen services, libraries like Resilience4j give you most of it with far less to run.

---

### Q78. What is a Backend for Frontend?

**Answer.** A dedicated backend per client type — one for the mobile app, one for web, one for partner APIs — each shaped for that client's needs and owned by the team building that client.

It solves the problem that a single general-purpose API serves every client badly: mobile wants few, fat, latency-optimised calls over a poor network; web can make many chatty calls; partners want stability above all. A shared API becomes a negotiation between conflicting needs, and the team owning it becomes a bottleneck.

The BFF handles aggregation, client-specific shaping, and client-specific caching. Downstream services stay client-agnostic.

**The cost:** duplication across BFFs, and a risk of business logic drifting into them. The rule is that a BFF orchestrates and shapes; it does not decide.

---

## 7. Microservices: Communication & Integration

### Q79. How do you version a service API?

**Answer.** Prefer not to. Additive changes — new optional fields, new endpoints — break nobody, provided clients are built to ignore unknown fields (and you should mandate that in your API guidelines, since it's the single cheapest compatibility measure available).

When a breaking change is unavoidable: version in the URI path (`/v2/payments`) for visibility and simplicity, or by content negotiation for finer granularity. Then run both concurrently, instrument usage per version *per consumer*, publish a deprecation timeline with `Deprecation` and `Sunset` headers, and remove only when usage is zero.

For internal service-to-service, a schema registry with enforced compatibility rules (Q117 in the data bank) is better than URI versioning — it catches the break at build time rather than at runtime.

**Follow-up: What counts as a breaking change?**
Removing or renaming a field; changing a type; making an optional field required; tightening validation; changing the meaning of an existing field (the sneaky one — same shape, different semantics, and no tooling catches it); changing error codes clients branch on; and changing default behaviour. Adding an optional field is safe *only* if clients tolerate unknowns.

---

### Q80. Explain consumer-driven contract testing.

**Answer.** Each consumer declares its expectations of a provider as a contract — the requests it makes and the responses it needs. Those contracts are published to a broker (Pact Broker or similar), and the provider's build verifies it satisfies every registered consumer contract. If a provider change would break a consumer, the *provider's* build fails, before deployment.

This solves the central integration problem in microservices: you can't run end-to-end tests across twenty services for every commit, but you also can't deploy blind. Contract tests give you integration confidence with unit-test speed and no shared environment.

The important property is the direction: contracts are written by consumers, expressing what they actually use, not by providers guessing. A provider that changes a field no consumer reads is free to do so.

**Follow-up: What are the practical difficulties?**
Organisational more than technical: the provider team must treat a failing contract verification as a real failure, not someone else's problem, and that requires agreement about who owns compatibility. Also, contracts capture syntax and examples, not semantics — a provider can satisfy every contract while changing what a field *means*.

---

### Q81. How do you prevent cascading failure across services?

**Answer.** Layered defences, each covered in the Java bank (Q125–Q126) but composed here:

- **Timeouts everywhere**, forming a decreasing budget down the call chain. A missing socket timeout is the most common root cause of a total outage.
- **Circuit breakers** so a failing dependency stops consuming your threads and stops adding load to its recovery.
- **Bulkheads** — a separate thread pool or semaphore per dependency, so one slow downstream can't consume all your capacity.
- **Retries with jittered backoff and a retry budget**, only for idempotent operations.
- **Load shedding** — reject early with 429/503 when saturated, rather than queueing until you fall over.
- **Fallbacks** that are genuinely useful (cached or degraded response), not just faster failure. In payments, never a fallback that assumes success.
- **Asynchronous communication** where the caller doesn't need the answer, which removes the availability coupling entirely.

**Why it matters.** The pattern to articulate is that **retries are load**, and the thing you're retrying is already overloaded. Most cascading failures are amplified by the client's own recovery behaviour.

---

### Q82. How does service discovery work, and do you need it?

**Answer.** Services need to find each other's instances, which change constantly with autoscaling and deployment.

- **Client-side discovery** — the client queries a registry (Consul, Eureka) and load-balances itself. More control, more client complexity, language-specific libraries.
- **Server-side discovery** — the client calls a stable address and a load balancer or the platform routes it. Simpler clients.
- **Platform-provided** — Kubernetes services with DNS. The client calls `payments-service` and the platform resolves and balances. This is what most teams should use, because it's already there.

**Do you need explicit tooling?** Usually not any more. Kubernetes gives you discovery and load balancing for free; a service mesh adds smarter balancing, retries and mTLS on top. Running Eureka or Consul yourself is a decision that needs a reason in 2026.

---

### Q83. What is a service mesh, and when is it worth it?

**Answer.** A dedicated infrastructure layer handling service-to-service communication, implemented as sidecar proxies (Istio/Envoy, Linkerd) or increasingly as a node-level or ambient proxy. It provides mTLS between services, retries, timeouts, circuit breaking, load balancing, traffic shifting for canaries, and uniform telemetry — all without application code.

The appeal is that these concerns become consistent and language-agnostic. In a polyglot estate, that's a genuine win: you don't reimplement Resilience4j in Go and Python.

**When it's worth it:** many services, multiple languages, a strong requirement for mTLS everywhere (common in regulated environments), and a platform team to operate it. Below that, the operational complexity — an extra proxy per pod, a control plane, upgrade cycles, and debugging that now includes the mesh — exceeds the benefit. Resilience4j plus Kubernetes services covers a lot.

**Follow-up: What are the failure modes?**
The sidecar becomes part of every request path, so a mesh misconfiguration is a total outage. Latency is added at every hop. And debugging gains a layer: "is this the app, the sidecar, or the control plane?" is a question you'll be asking at 3am.

---

### Q84. How do you propagate context — auth, tenant, trace — across services?

**Answer.** Standardised headers, injected and extracted by shared middleware rather than by application code. `traceparent`/`tracestate` (W3C) for tracing, an auth token, a tenant identifier, and a correlation ID for the business transaction.

Three things that make it work in practice:
- **Propagate across asynchronous boundaries too** — into message headers, and back out in the consumer. This is where most implementations break, and it's exactly where you most need the trace.
- **Never trust propagated identity from an untrusted source.** A tenant header from an internal service is fine only if the perimeter validated it; a gateway that strips and re-adds identity headers is the standard approach.
- **Bound what you propagate.** Context headers grow without discipline, and they end up in logs.

**Follow-up: How does this interact with virtual threads?**
`ThreadLocal`-based context (MDC, Spring Security's context holder) is expensive when you have a million threads, and `InheritableThreadLocal` copies a map to every child. Java 21's `ScopedValue` is the intended replacement (Q91 in the Java bank), and framework support for context propagation across async boundaries is worth checking before adopting virtual threads in a service that depends heavily on MDC.

---

### Q85. How do you handle a slow or unreliable third-party provider?

**Answer.** Treat it as permanently unreliable and design accordingly:

- **Aggressive, explicit timeouts** — shorter than your own SLA, not the provider's default.
- **Circuit breaker with a meaningful fallback** — for a payment provider, that might mean failing over to a secondary acquirer, which turns an outage into a routing decision.
- **Bulkhead** — cap concurrent calls so a provider slowdown can't consume your capacity.
- **Asynchronous where possible** — accept the request, acknowledge to the user, process against the provider in the background with retries.
- **Idempotency keys** on every call (Q121 in the Java bank), because you *will* time out without knowing the outcome.
- **A reconciliation process** — the only reliable way to resolve "unknown" outcomes is to ask the provider later what actually happened, and to have a scheduled job that does so.
- **Contract tests against their sandbox**, run on a schedule outside the main pipeline.

**Why it matters.** In payments this is the daily reality, and the reconciliation point is the one that separates people who've operated these integrations from people who've read about resilience patterns. Retries and circuit breakers handle failures you can see; reconciliation handles the ones you can't.

---

### Q86. Webhooks: how do you design them well, on both sides?

**Answer.** **As a producer:** sign every payload (HMAC over the raw body, with a timestamp to prevent replay); include an event ID and event type; deliver at-least-once with exponential backoff over hours or days; expose a delivery log and a manual replay; version the payload; and keep it small, with a reference the consumer can fetch for detail. Send events, not commands.

**As a consumer:** verify the signature before parsing; respond 2xx **fast** and process asynchronously (queue it) — providers time out and retry, so slow processing generates duplicates; dedupe on the event ID; tolerate out-of-order delivery by checking state rather than assuming sequence; and never trust the payload as the source of truth for anything financial — treat it as a notification to go and fetch authoritative state.

**Why it matters.** Webhook handling is where at-least-once delivery meets an HTTP endpoint someone wrote quickly, and it's a very common source of duplicate-processing incidents.

---

### Q87. What's the difference between an API contract and an event contract, in terms of ownership?

**Answer.** An **API contract** is owned by the provider and shaped by consumer needs through negotiation; the provider knows who its consumers are and can measure usage per consumer.

An **event contract** is subtler: the publisher doesn't necessarily know who consumes, consumers can appear without asking, and the events are typically retained, so old versions live in the log for as long as retention allows. That makes an event schema a *more* public and *longer-lived* commitment than an API.

The practical implications: use a schema registry with enforced compatibility; never publish internal domain events directly as integration events (Q49); design event payloads for consumers you haven't met; and be very deliberate about what you promise, because you'll be deserialising this year's events in three years' time.

---

### Q88. Should services share a database? Ever?

**Answer.** Default no — a shared database is the strongest coupling available. Every service's schema becomes every other service's contract, nobody can change a table without coordinating, migrations require synchronised deployment, and one service's runaway query degrades everyone. It's the defining characteristic of a distributed monolith.

The narrow legitimate exceptions: during a **migration** (extracting a service, with a documented plan and end date); a **read-only replica** for reporting where the schema is treated as a published contract with its own compatibility rules; and services that are genuinely one bounded context deployed separately for scaling reasons, owned by one team.

Every one of those needs a stated reason and an owner. "It was easier" isn't one.

**Follow-up: What if a service needs another's data?**
Options in order of preference: ask via its API (simple, always fresh, adds a synchronous dependency); subscribe to its events and keep a local read model (fast, no runtime dependency, eventually consistent, duplicated storage); or, if the query genuinely spans services, build a dedicated read model fed by events (CQRS, Q90). What you don't do is read its tables.

---

## 8. Microservices: Data & Consistency

### Q89. How do you query data that spans several services?

**Answer.** Three options, with a clear preference order:

1. **API composition** — the caller (or a BFF) queries each service and joins in memory. Simple, always fresh, no extra storage. Fails when the result set is large, when you need to sort or paginate across services, or when the fan-out latency is unacceptable. Good for "show me this order and its customer".
2. **CQRS read model** — a service subscribes to events from several services and maintains a purpose-built denormalised view. Fast, supports arbitrary queries, no fan-out at read time. Costs: eventual consistency, extra storage, and a projection that must be rebuildable. Good for search, dashboards and reports.
3. **A dedicated reporting/analytics store** fed by CDC or events, for genuinely analytical questions.

**Why it matters.** The instinct to reach for a distributed join or a shared database is what this question tests. The correct answer is that cross-service queries are a *design* problem — if you need them constantly, the boundaries may be wrong (Q63).

---

### Q90. Explain CQRS and when it's justified.

**Answer.** Command Query Responsibility Segregation: separate the model used for writes from the model used for reads. At its mildest that's two sets of classes against one database. At its fullest it's separate stores, with the read side maintained asynchronously from events.

Justified when read and write workloads genuinely differ: reads vastly outnumber writes, reads need different shapes than the write model provides, or the write model is normalised for invariants while reads want denormalised views. A payment write model enforces state transitions; a merchant dashboard wants a flat, aggregated, searchable view. Forcing both through one model serves neither.

**Not justified** as a default. For a CRUD service, CQRS doubles the code for no benefit, and the asynchronous variant introduces eventual consistency that will surface in the UI as "I just saved it and it's not there".

**Follow-up: How do you handle the read-your-own-writes problem?**
Return the result from the write response rather than re-reading; or route reads to the write model for a short window after a write; or track a version/LSN and have the read side wait for it. Whichever you choose, it must be a deliberate decision — "the user saves and sees stale data" is the single most common CQRS complaint and it's entirely predictable.

---

### Q91. Explain event sourcing and its real costs.

**Answer.** Instead of storing current state, store the sequence of events that produced it; current state is a fold over the event stream. Snapshots make replay fast.

**Benefits:** a complete, immutable audit trail (genuinely valuable in finance and often a regulatory requirement); time travel — reconstruct state at any past moment; the ability to build new projections retroactively from historical events; and a natural fit with event-driven integration.

**Costs, which are substantial:**
- **Schema evolution over years.** You will deserialise 2021's events in 2029. Upcasting is code you maintain forever.
- **Querying requires projections** for everything; there's no ad-hoc query over event streams.
- **Eventual consistency** between the event store and every read model.
- **GDPR erasure** in an immutable log — crypto-shredding is the usual answer, and it must be designed in from the start.
- **Team cognitive load.** It's a genuinely different way of thinking, and onboarding is slower.
- **Aggregate design becomes critical** — a stream that grows unboundedly is a performance problem no snapshot fully fixes.

**Why it matters.** The honest position: event sourcing is excellent for a *core* domain where audit and temporal queries have real business value — a ledger, a trading book, a claims process. Applying it to the whole system is a common and expensive mistake. Most systems want an audit log, not event sourcing.

---

### Q92. How do you keep duplicated data consistent across services?

**Answer.** Accept that it will be eventually consistent and design for that explicitly:

- **One owner per piece of data.** Exactly one service is authoritative; everyone else holds a cached copy and knows it. Ambiguous ownership is the root of most data-consistency incidents.
- **Propagate by events**, published via the outbox so they can't be lost (Q136 in the data bank).
- **Version every replicated record** so an out-of-order update doesn't overwrite newer state.
- **Make consumers idempotent** — at-least-once delivery guarantees duplicates.
- **Reconcile periodically.** A job that compares the copy against the source and reports divergence. This is non-negotiable in financial systems, and it's the control that catches the bugs the pipeline doesn't.
- **Be able to rebuild** the copy from scratch by replaying events.

**Why it matters.** The last two are what separate a design that works from one that works until it silently doesn't. Every event-driven system drifts; the only question is whether you find out from a reconciliation alert or from a customer.

---

### Q93. How do you migrate data when extracting a service?

**Answer.** The hardest part of extraction (Q67), and it needs its own plan:

1. **Identify the data the new service will own**, and find every reader and writer — including batch jobs, reports and anything with database access you didn't know about.
2. **Remove cross-boundary joins and foreign keys first**, while everything is still in one database. Replace them with API calls or denormalised copies. This is the bulk of the work.
3. **Dual-write** to old and new stores, with the old one authoritative, and reconcile continuously to prove they agree.
4. **Backfill** history into the new store, in resumable, throttled batches.
5. **Switch reads** to the new store behind a flag, monitoring for divergence.
6. **Switch writes**, keeping the old path available for rollback.
7. **Decommission** — and actually delete, so nobody discovers the old table still being written to in a year.

**Why it matters.** Steps 3 and 5 — dual-run with reconciliation — are what makes this safe for financial data, and they're what teams under time pressure cut. The reconciliation is the evidence that the cutover is safe; without it you're cutting over on hope.

---

### Q94. What's the right way to handle reference data shared across services?

**Answer.** Reference data — currencies, country codes, fee schedules, merchant categories — is read by everyone and changed rarely, which tempts people into a shared database.

Better options depending on volatility:
- **Truly static** (ISO country codes) — embed it in each service. It doesn't change; a library or a config file is fine.
- **Slowly changing** (fee schedules, product catalogue) — one owning service publishes changes as events; consumers keep a local cache and rebuild from a compacted topic. Fast local reads, no runtime dependency, eventual consistency measured in seconds.
- **Frequently changing or large** — an API call with local caching and a sensible TTL, plus a circuit breaker and a stale-if-error fallback so the owner's outage doesn't take everyone down.

**Why it matters.** The failure mode to avoid is a synchronous call to a reference-data service on every request — you've made a rarely-changing lookup into a hard availability dependency for the whole estate. The event-plus-local-cache pattern is almost always the right answer, and it's a good example of trading storage for decoupling.

---

### Q95. How do you do reporting across microservices?

**Answer.** Not by querying the services. A reporting query that fans out across twelve services is slow, fragile, and puts analytical load on transactional systems.

The pattern: each service publishes events (or is tapped by CDC), those land in a central analytical store — a warehouse or lakehouse — and reporting queries run there. The transformation layer builds the joined, denormalised models the business actually wants.

Design points: land raw data immutably first so transformations can be re-run; version schemas and tolerate evolution; handle late-arriving data explicitly; and — the one people skip — run reconciliation between the warehouse and the source of truth, because silent divergence is the standard failure mode (Q140 in the data bank).

**Follow-up: Who owns the analytical model?**
This is where data mesh arguments come in. The pragmatic position: the producing team owns the *data product* it publishes — its schema, quality and documentation — and a central team owns the platform and the cross-domain models. Making producing teams accountable for the quality of what they emit is the change that actually improves things; the rest is org design.

---

## 9. Operations, Testing & Organisation

### Q96. What's the testing strategy for a microservices system?

**Answer.** The end-to-end test suite that spans all services is the thing to *avoid* — it's slow, flaky, requires a shared environment, and nobody can debug a failure. Replace it with layers:

- **Unit tests** — the bulk, no framework, milliseconds.
- **Integration tests per service** — against real dependencies via Testcontainers (real database, real broker). This is where most bugs are found.
- **Contract tests** (Q80) — replace cross-service integration testing.
- **Component tests** — the whole service in isolation with its collaborators stubbed at the boundary.
- **A very small set of end-to-end journeys** — the two or three flows that must never break, run against a staging environment, accepted as slow.
- **Production verification** — synthetic transactions, canary analysis, and good alerting.

**Why it matters.** The insight to state: in a distributed system you cannot achieve confidence through pre-production testing alone. You shift some of the confidence budget into production — progressive delivery, feature flags, fast rollback, strong observability. That's not a compromise, it's the correct response to the architecture.

---

### Q97. Explain progressive delivery: blue-green, canary, feature flags.

**Answer.**
- **Blue-green** — two identical environments; deploy to the idle one, verify, switch traffic, keep the old one for instant rollback. Simple, and expensive (double capacity). Database changes must be compatible with both versions, which is the real constraint.
- **Canary** — route a small percentage of traffic to the new version, compare error rates and latency against the baseline, and increase gradually or roll back automatically. Limits blast radius, catches problems only real traffic reveals. Needs good metrics and enough traffic for statistical signal.
- **Feature flags** — decouple *deploy* from *release*. Ship the code dark, enable for internal users, then 1%, then everyone. Enables trunk-based development and instant kill switches without a redeploy.

**Why it matters.** These are complementary: deploy via canary, release via flag. The combination means a bad feature is disabled in seconds rather than rolled back in minutes.

**Follow-up: What's the cost of feature flags?**
Flag debt. Every flag is a branch in the code and a combinatorial explosion in what you're actually testing. Flags need owners, expiry dates, and a routine cleanup discipline; a codebase with 200 stale flags is harder to reason about than one with none.

---

### Q98. What does good observability look like across services?

**Answer.** Three signals, correlated:

- **Metrics** — RED per service and endpoint (rate, errors, duration as histograms so percentiles aggregate correctly), resource saturation (pools, queues, threads), and business metrics (authorisations per minute by result code).
- **Traces** — distributed, with context propagated across HTTP and message boundaries (Q84). This is the one that makes microservices debuggable at all.
- **Logs** — structured, with trace and span IDs so a log line joins a trace.

The thing that matters more than any individual signal is **correlation**: alert → trace → logs in two clicks. And the alerts should be tied to business outcomes and SLOs, not to CPU.

**Follow-up: What's the difference between monitoring and observability?**
Monitoring answers questions you predicted — dashboards for known failure modes. Observability is the ability to answer questions you *didn't* predict, by exploring high-cardinality data after the fact. In a distributed system most incidents are novel, so the ability to ask "which of these 40 merchants saw elevated latency on this endpoint in this AZ?" without shipping code is the capability that matters.

---

### Q99. How do you define and use SLOs and error budgets?

**Answer.** An **SLI** is a measurement (proportion of requests served under 300 ms). An **SLO** is a target for it (99.5% over 30 days). The **error budget** is the allowed shortfall — 0.5%, which for a month is a concrete quantity of failure you may spend.

The budget is what makes it useful, because it converts reliability from an argument into arithmetic. Budget remaining → ship faster, take risks. Budget exhausted → the team stops feature work and spends on reliability. That rule, agreed in advance, replaces the recurring and unwinnable "should we prioritise reliability or features" debate.

Setting them: from what users actually need, not from what's achievable. Chasing availability beyond user-perceptible benefit costs enormously and buys nothing — and an SLO of 100% is a statement that you'll never deploy.

**Why it matters.** This is a leadership tool disguised as an ops practice. It gives you a principled, pre-agreed way to say no to feature pressure, which is one of the harder parts of the lead role.

---

### Q100. How do you handle configuration and secrets across many services?

**Answer.** **Config**: externalised per environment, injected at runtime (environment variables or mounted files), validated at startup so a bad value fails fast rather than at 3am on the first request that touches it. Type-safe binding with validation, not scattered string lookups. A shared config service is an option but adds a startup dependency — weigh that carefully.

**Secrets**: never in code, never in the image, never in a repo. A secret manager (Vault, cloud KMS-backed) with short-lived, rotatable credentials, mounted as files rather than environment variables where possible — env vars leak into crash dumps, `/proc`, child processes and logs. Audit access. And have a tested rotation procedure, because "we can rotate" and "we have rotated" are different claims.

**Follow-up: How do you handle a leaked secret?**
Rotate first, investigate second — the same instinct as mitigate-before-diagnose in an incident. Then determine the exposure window and what could have been accessed with it. Then fix the mechanism that allowed it, which is usually a missing pre-commit scan or a secret in an env var that got logged. Secret scanning in CI and in pre-commit hooks prevents most of these.

---

### Q101. How do you run an incident?

**Answer.** Roles first: an **incident commander** who coordinates and decides, separate from the people investigating. Without that split, the best debugger is also fielding stakeholder questions and nobody is doing either job.

Then: **mitigate before diagnosing.** Roll back, fail over, disable the feature flag, shed load. Diagnosis happens on artefacts — dumps, logs, traces — not on the live system while customers are affected. Every minute spent understanding while impact continues is a choice you're making.

Communicate on a cadence even when there's nothing new; silence causes escalation. Keep a timestamped log as you go, because reconstructing it afterwards is unreliable and the timeline is the most valuable postmortem input.

Then a **blameless postmortem** within a few days: timeline, contributing factors (plural — there's never one cause), and action items with named owners and dates. The most valuable output is usually not the fix but the improved *detection* — the alert that should have fired twenty minutes earlier.

**Why it matters.** The blameless part isn't sentiment. Blame produces concealment, and concealed incidents can't be learned from. Getting a team to that culture is a leadership job.

---

### Q102. How do you decide what technical debt to pay down?

**Answer.** Debt is not a single thing. I'd separate:

- **Deliberate and prudent** — "we shipped without the retry logic to hit the deadline, ticket exists". Legitimate; pay it deliberately.
- **Deliberate and reckless** — "we don't have time for tests". Cultural problem, not a technical one.
- **Accidental** — we learned something and now the design is wrong. Normal and unavoidable.
- **Bit rot** — dependencies, deprecated APIs, unsupported versions. Non-negotiable; this becomes a security problem.

Prioritise by **interest rate**, not by how ugly it is: which debt is slowing you down or creating risk *right now*? A hideous module nobody touches costs nothing. A moderately bad module that every feature passes through costs continuously.

**Follow-up: How do you get time for it?**
Attach it to feature work where possible — "make the change easy, then make the easy change" (Q26). For larger items, quantify the cost in the business's terms: "this adds three days to every payment-related feature, and we ship six a quarter." A number changes the conversation; "the code is bad" does not. And an error budget (Q99) gives you a pre-agreed mechanism for the reliability subset.

---

### Q103. How do you introduce architectural change to a team that disagrees?

**Answer.** Start by assuming they may be right — they usually have context you don't, especially if you're new. Then:

1. **Establish the problem before the solution.** Agreement on "cross-service changes take three weeks" is much easier than agreement on "we should merge these services", and it's the necessary first step.
2. **Bring evidence.** Cycle time, incident frequency, the number of files a typical change touches. Data moves arguments that opinion doesn't.
3. **Make it small and reversible.** Propose a trial on one service, with agreed criteria for judging it. It's far easier to agree to an experiment than to a commitment.
4. **Write the ADR** (Q57) including the objections. People are much more willing to disagree-and-commit when their objection is recorded rather than dismissed.
5. **Separate reversible from irreversible.** For reversible decisions, don't spend political capital — let it go and revisit with evidence. Save it for the one-way doors.

**Why it matters.** Being right is not sufficient; a lead's effectiveness is measured by change that actually happens. Someone who wins arguments and changes nothing has failed at the job.

---

### Q104. How do you make architectural decisions with incomplete information?

**Answer.** Classify the decision first. **Two-way doors** (reversible) should be decided fast and cheaply — the cost of deciding slowly exceeds the cost of being wrong. **One-way doors** (data model, service boundaries, public API contracts, choice of persistence, anything with a migration cost) deserve real analysis, written options, and wider input.

For the hard ones: state explicitly what you'd need to know to be confident, and whether you can cheaply find out — a spike, a load test, a prototype against real data. Often a day of investigation removes the uncertainty entirely, and people skip it because deciding feels like progress.

Then decide, write down the assumptions and what would change your mind, and set a review trigger: "revisit if write throughput exceeds X" turns a decision into a hypothesis with a test.

**Why it matters.** Waiting for complete information is itself a decision, usually a bad one. The senior skill is calibrating effort to reversibility.

---

### Q105. How do you grow the engineers around you?

**Answer.** Concretely rather than aspirationally:

- **Pair on hard problems** rather than taking them over. The instinct to just fix it is the enemy here.
- **Delegate work slightly beyond someone's current level**, with a safety net and a check-in, rather than delegating only what's safe. Growth happens at the edge of competence.
- **Explain reasoning in review**, not just conclusions. "Change this to X" teaches nothing; "X because when we change Y later, this version means touching one file instead of nine" teaches a way of thinking.
- **Make your own uncertainty visible.** Juniors see seniors' polished conclusions and conclude that seniors don't struggle. Saying "I don't know, here's how I'd find out" is one of the most useful things you can model.
- **Write things down** — ADRs, runbooks, design docs — so knowledge isn't only in conversations.

The measure: is the team's output less dependent on you over time? If you're the only person who can debug the reconciliation job, you've failed at the lead part of the role regardless of how well you debug it.

---

### Q106. What's the difference between a senior engineer and a lead?

**Answer.** A senior engineer is accountable for their own work and its quality. A lead is accountable for the **system** and the **team's ability to change it** — which means much of the work is no longer typing.

Concretely, the additions: setting and defending technical direction over a horizon longer than the current sprint; owning the codebase's conventions and the mechanisms that enforce them; making irreversible decisions with incomplete information and recording why; translating between business priorities and technical constraints in both directions; growing people; and being the person who says "we're not doing that" with reasons that survive scrutiny.

The hardest adjustment is that your leverage is now indirect. A day spent unblocking four people produces more than a day spent writing your best code, and it feels far less productive.

**Why it matters.** This question is often the last one asked, and it's checking whether you want the job or the title. The most honest answer includes what you'd find difficult about it.

---

### Q107. Give me an architecture you'd defend for a mid-size payments platform, and its weakest point.

**Answer.** A modular monolith or a small number of services aligned to bounded contexts — payments, ledger, merchant, notifications — not twenty. PostgreSQL as the single system of record for money, with the ledger and idempotency keys in one transactional boundary. Kafka as the event backbone, fed by the outbox. Redis for hot reads and rate limiting, treated as disposable. Read models for merchant dashboards and search, rebuildable from events. Reconciliation jobs comparing every derived store back to the ledger.

Hexagonal structure inside each service, so domain logic is testable without infrastructure. Contract tests between services. Progressive delivery with feature flags. SLOs on the authorisation path with an error budget.

**The weakest point**, named before being asked: the single PostgreSQL primary is the write ceiling and the highest-risk failover in the system. It's the right call at this size — one place where money is correct, no distributed consensus in the critical path — but it means write capacity is bounded by one machine. The mitigation is knowing the current headroom, rehearsing failover on a schedule, and having a costed but unbuilt partitioning-by-merchant plan.

**Why it matters.** Every architecture answer should end with what breaks first and what you're doing about it. Confidence without a named weakness reads as inexperience.

---

## 10. Remaining Patterns & Topics

### Q108. Cover the GoF patterns we haven't discussed — briefly, and say which still matter.

**Answer.** Grouped by how often they still earn their place:

**Still genuinely useful:**
- **Composite** — treat individual objects and compositions uniformly through one interface. Real uses: UI trees, a nested validation rule set, an org hierarchy, a composite fee structure where a "bundle" fee is the sum of its parts. The uniform interface is what makes recursion over the structure clean.
- **Flyweight** — share immutable intrinsic state across many instances to save memory. `Integer.valueOf`'s cache and `String` interning are flyweights. Relevant when you have millions of objects with a small set of distinct values; irrelevant otherwise.
- **Mediator** — centralise communication between components that would otherwise all know each other, turning N² relationships into N. An orchestrator (Q60) is a mediator at service scale.

**Mostly absorbed by the language or a framework:**
- **Prototype** — clone an existing instance rather than constructing. Largely superseded by copy constructors and records with `with`-style copies; `Cloneable` is broken anyway.
- **Iterator** — `for-each` and `Stream`. You implement `Iterable`, not the pattern.
- **Bridge** — separate an abstraction from its implementation so both vary independently. In practice this is what DIP plus composition already gives you; the explicit two-hierarchy version is rare.
- **Memento** — capture and restore state. Realised in practice as event sourcing, snapshots, or database savepoints rather than as a class.
- **Interpreter** — building a language. If you genuinely need one, use a parser generator.

**Why it matters.** Being able to triage the catalogue — which patterns are still design tools versus which were workarounds for missing language features — is a better signal than reciting all 23.

---

### Q109. What is the Unit of Work pattern, and where have you already used it?

**Answer.** It tracks all objects affected by a business transaction, works out what changed, and writes them out in one coordinated commit — resolving ordering and consistency in the process.

You've used it without naming it: JPA's persistence context is a Unit of Work. It tracks managed entities, dirty-checks them at flush, orders the resulting statements by type, and commits together. That's also why Q120 in the data bank matters — the ordering isn't yours, and the delete-then-insert case fails as a result.

Implementing one yourself is rare and usually a sign you're building an ORM. What's worth taking from it is the *concept*: a business operation should have one commit point, and the code shouldn't scatter individual saves through the call chain. Explicit `repository.save()` calls sprinkled across a service are a symptom of not having a unit of work boundary.

---

### Q110. Should you use a Result/Either type instead of exceptions?

**Answer.** It depends on whether the failure is *expected*.

For genuinely exceptional conditions — a database is down, a bug — exceptions are right: they propagate automatically, they carry a stack trace, and forgetting to handle them is usually correct behaviour.

For *expected* domain outcomes — insufficient funds, card declined, validation failed — a `Result<T, Error>` or a sealed `sealed interface AuthResult permits Approved, Declined, Requires3DS` is better. The outcome is part of the method's contract rather than hidden in a throws clause, exhaustive pattern matching forces the caller to handle every case, and you don't pay for stack trace capture on a path that fires thousands of times a second.

```java
sealed interface AuthResult permits Approved, Declined, Requires3DS {}
// caller cannot forget the Requires3DS branch — the compiler checks
```

**Why it matters.** The distinction is "is this a failure, or is this one of the answers?" A declined card is an answer. Modelling it as an exception makes the normal path look exceptional and pushes control flow into catch blocks.

**Follow-up: What's the downside?**
It's viral — a Result type propagates up the call stack and every caller must unwrap it, which is verbose without language support for monadic composition. In practice I'd use it at domain boundaries where the outcomes matter and keep exceptions for genuine faults, rather than converting the whole codebase.

---

### Q111. SOA versus microservices — is there a real difference?

**Answer.** Both decompose systems into services. The differences are of degree and of era:

- **SOA** typically had an **enterprise service bus** with routing, transformation and orchestration logic centralised in the middleware — "smart pipes, dumb endpoints". Microservices invert that: "dumb pipes, smart endpoints", with the broker doing nothing but delivery.
- **SOA** often shared a database and a canonical enterprise data model. Microservices insist each service owns its data (Q88) and rejects the canonical model (Q47).
- **SOA** services were often large and organisationally centralised, with a governance board. Microservices are team-owned and decentralised.
- SOA predated the operational tooling — containers, CI/CD, observability — that makes many small services practical.

**Why it matters.** The ESB is the specific lesson: centralising integration logic creates a bottleneck that every team must queue for, and a single point of failure with business rules in it. That's the same trap as putting logic in an API gateway (Q77). Being able to name it means you'll recognise it when someone proposes it again with a new name.

---

### Q112. Where does serverless fit?

**Answer.** Good fit: spiky or unpredictable traffic where you'd otherwise pay for idle capacity; event-driven glue (react to a file upload, a queue message, a schedule); genuinely stateless request/response work; and small teams who want to minimise operational surface.

Poor fit: sustained high throughput (it becomes more expensive than instances); latency-sensitive paths where cold starts matter — the JVM is the worst case here, which is what SnapStart and native images address; long-running work; anything needing large in-memory state or connection pools, since each invocation may hold its own database connection and you exhaust the pool at scale.

That last point is the practical killer for Java payment services: a thousand concurrent lambdas is a thousand potential connections against a database that wants twenty (Q47 in the data bank). The mitigation is a proxy layer, which adds back the infrastructure you were trying to avoid.

**Why it matters.** Serverless is a deployment model, not an architecture. The design questions — boundaries, data ownership, consistency — are unchanged; the operational trade-offs are what shift.

---

### Q113. What is chaos engineering and would you use it?

**Answer.** Deliberately injecting failure into a system to verify it behaves as designed — killing instances, adding latency, dropping a dependency, saturating a resource — with a hypothesis stated in advance and a blast radius you control.

The value is that resilience mechanisms are only real if they've been exercised. A circuit breaker that has never opened in production is untested code on the most critical path you have. Failover that has never been performed is a hypothesis.

I'd start conservatively: game days in a staging environment with production-like traffic, then scheduled failover drills in production during business hours with everyone watching, then automated experiments with automatic abort conditions. In a regulated payments environment, the governance conversation comes before the tooling one.

**Why it matters.** The prerequisite is honest: you need good observability and a fast rollback before you can do this safely. Teams that adopt chaos engineering before they can see what's happening are just causing incidents.

---

### Q114. How do you keep dependencies current across many services?

**Answer.** Automate the routine and centralise the decisions. Automated dependency PRs (Renovate/Dependabot) with grouped updates and auto-merge for patch versions where the test suite is trusted. A scheduled, non-negotiable slot for major upgrades — the framework major, the JDK major — because these never happen if they compete with features.

Vulnerability scanning in CI with a policy that fails the build on new criticals, plus an SBOM per service so that when the next Log4Shell arrives you can answer "are we affected and where" in minutes rather than days. That question is the one that matters, and most organisations cannot answer it quickly.

For consistency across services: a shared parent POM or version catalogue that pins versions, with services free to override deliberately. That gives you one place to bump a library across the estate without forcing lockstep deployment.

**Why it matters.** In a microservices estate, dependency management is N times the work, and it's the cost people forget when counting the price of a new service (Q73).

---

### Q115. How do you think about the cost of an architecture?

**Answer.** Three cost lines, and engineers usually only count the first:

- **Infrastructure** — instances, storage, network egress (frequently the surprise), managed service fees, and the cost of redundancy and idle headroom.
- **Operational** — on-call load, incident time, deployment effort, upgrade effort, monitoring. This scales with the number of moving parts, which is where microservices get expensive.
- **Cognitive and organisational** — onboarding time, how long a change takes end to end, coordination overhead between teams.

The last one dominates over a system's lifetime and is almost never measured. A design that saves 30% on compute but adds two days to every feature is a bad trade at any reasonable engineer cost.

**Follow-up: Where does the money actually go in a cloud payments platform?**
Usually: over-provisioned compute for peak, cross-AZ data transfer (Kafka replication and consumer fan-out are big contributors — rack-aware fetch-from-closest-replica is a real saving), oversized managed databases, log volume, and forgotten non-production environments. Tagging by service and putting cost on a dashboard the team sees is what changes behaviour; a monthly bill nobody owns does not.

---

### Q116. What makes a good runbook?

**Answer.** Written for someone woken at 3am who did not build the system. That means: symptoms first (what the alert says, what the graphs look like), then the specific diagnostic commands with expected output, then the mitigation steps, then escalation with names.

What makes them fail: written from the author's context ("check the usual dashboard"), never tested by anyone else, and never updated after the incident that proved them wrong. A runbook that hasn't been used in a drill is fiction.

The best version is one where the diagnostic steps are links to pre-filtered dashboards and log queries rather than instructions to construct them. At 3am, cognitive load is the enemy.

**Why it matters.** Runbooks are one of the highest-leverage artefacts a lead can insist on, because they convert individual knowledge into team capability — which is exactly the transition from senior to lead (Q106).

---

### Q117. How do you onboard a new engineer onto a microservices codebase?

**Answer.** The hard part is that no single repository explains the system. So:

- A **system-level map** — which services exist, what each owns, who owns it, and how a canonical request flows through them. One diagram, kept current, is worth more than fifty READMEs.
- A **golden path** — a documented, working procedure for creating and deploying a trivial service, run end to end in the first week. Nothing teaches the platform faster than using it.
- **A real task in week one**, small and shippable, with a pairing partner. Reading code without a goal doesn't produce understanding.
- **ADRs** (Q57), so the strange decisions have explanations attached rather than looking like incompetence.
- Explicitly naming **who to ask about what**, because in a distributed system the knowledge is distributed too.

**Why it matters.** Onboarding time is a direct measure of architectural comprehensibility. If it takes three months, that's telling you something about the system, not about the hire.

---

### Q118. What's your approach to code review standards across a team?

**Answer.** Automate everything that can be automated so review time goes to what humans are good at. Formatter and linter in the build (never a review comment about style). Static analysis for real defect classes. ArchUnit for boundary rules (Q56). Coverage as a floor, not a target.

Then set expectations for the human part: correctness and edge cases first, then security and data handling, then design and whether this makes the codebase easier to change, then tests. Distinguish blocking concerns from suggestions explicitly. Ask questions rather than issue instructions when context might be missing. And if a review passes about ten comments, stop typing and have a conversation — that's a design disagreement, not a review.

The standard I'd hold the team to: reviews within a day, because a fast adequate review beats a slow perfect one, and review latency is a major contributor to cycle time.

---

### Q119. How do you decide whether to build, buy, or use open source?

**Answer.** Start from whether it's a **core, supporting, or generic subdomain** (Q52). Core domain — the thing that differentiates the business — you build, always. Generic subdomains — auth, payments infrastructure you're not differentiating on, email delivery, observability — you buy or adopt. Supporting subdomains are the judgement call.

Then evaluate the non-obvious costs: for buy, vendor lock-in, data residency, the exit cost, and whether their SLA is compatible with yours. For open source, the maintenance burden is real — you own the upgrades, the CVEs, and the operational knowledge — so "free" software has a staffing cost. For build, the ongoing cost is forever and always exceeds the estimate.

**Why it matters.** The failure mode is building generic capability because it's more interesting, and buying core capability because it looks like a shortcut. The second is worse: you've outsourced your differentiator.

---

### Q120. If you joined a team with a struggling microservices architecture, what would you do in the first 90 days?

**Answer.** Diagnose before changing anything.

**Weeks 1–4: understand.** Map the services, their dependencies and their owners. Read the last six months of incidents. Measure the things that matter: lead time from merge to production, deployment frequency, change failure rate, time to restore. Ask every engineer what slows them down most — they know, and the answers converge quickly.

**Weeks 4–8: find the actual constraint.** Struggling microservices are usually one of a small number of things: boundaries in the wrong place producing shotgun surgery (Q65), missing platform capability so every deploy is manual, no observability so every incident is archaeology, or an organisational mismatch (Q69). These have very different fixes, and treating the wrong one is expensive.

**Weeks 8–12: one visible improvement, plus a written plan.** Fix the thing with the best ratio of impact to risk — often deployment pipeline or tracing, because they compound. Then an ADR-backed plan for the structural work, with the evidence attached and a sequence that delivers value incrementally.

**What I would not do:** propose merging services back in week two. It may well be right, but without evidence it reads as the new person dismissing everyone's work, and you'll spend credibility you need later.

**Why it matters.** This question tests whether you lead with diagnosis or with opinions. The measurement step is the answer — and naming DORA-style metrics gives you a language the business already understands.

---

## Closing notes

**Judgement is the subject, not knowledge.** In the other two banks, answers are largely right or wrong. Here, almost every question has a defensible answer in both directions, and what's being assessed is whether you can hold the trade-off in view. "It depends" is a bad answer; "it depends on X, and here's how I'd find out X" is the right one.

**Have the counter-argument ready.** For every principle you cite, know its critique — SOLID's vagueness, DRY's over-application, microservices' organisational premise, DDD's cost. Citing a principle without its limits signals you've read about it rather than lived with it.

**Prefer the boring architecture.** A modular monolith on one PostgreSQL instance is the correct answer far more often than it is given in interviews. Being willing to say so, while showing you know exactly when it stops working, reads as more senior than proposing a distributed system.

**Bring the reversal.** The strongest single story in this domain is one where you removed something — a pattern, an abstraction, a service. Everyone can describe what they built. Far fewer can describe what they un-built, and why.

**Name the organisational half.** Almost every question in sections 6 to 9 has a team dimension: Conway's law, service ownership, who owns a contract, who can be on call. A candidate who answers these purely technically is answering half the question, and that half is the senior half.
