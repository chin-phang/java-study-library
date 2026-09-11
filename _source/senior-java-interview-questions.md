# Senior Java Interview Question Bank

**154 questions with model answers, explanations, and follow-ups.**

How to use this: the *Answer* is what you say out loud (aim for 45–90 seconds). The *Why it matters* section is the reasoning behind it — read it so you can survive being pushed. The *Follow-ups* are what a good interviewer actually asks next, and they're where senior candidates get separated from mid-level ones.

A senior answer almost always has three parts: the mechanism, the trade-off, and a time you hit it in production. If you can only give the mechanism, you sound like you read a blog post.

---

## Contents

1. [Core Language & OOP](#1-core-language--oop) (Q1–Q14)
2. [Generics](#2-generics) (Q15–Q21)
3. [Collections](#3-collections) (Q22–Q36)
4. [Streams & Functional Java](#4-streams--functional-java) (Q37–Q47)
5. [Concurrency](#5-concurrency) (Q48–Q70)
6. [JVM, Memory & Garbage Collection](#6-jvm-memory--garbage-collection) (Q71–Q86)
7. [Modern Java (8 → 21)](#7-modern-java-8--21) (Q87–Q97)
8. [Spring & Frameworks](#8-spring--frameworks) (Q98–Q110)
9. [Persistence & JPA](#9-persistence--jpa) (Q111–Q120)
10. [Distributed Systems, Microservices & Payments](#10-distributed-systems-microservices--payments) (Q121–Q133)
11. [Testing, Debugging & Engineering Practice](#11-testing-debugging--engineering-practice) (Q134–Q142)
12. [Modern Java (22 → 25)](#12-modern-java-22--25) (Q143–Q154)

---

## 1. Core Language & OOP

### Q1. Explain the `equals`/`hashCode` contract and what breaks when you violate it.

**Answer.** The contract has three parts. If `a.equals(b)` then `a.hashCode() == b.hashCode()`. Equal hash codes do *not* imply equality (collisions are legal). And `equals` must be reflexive, symmetric, transitive, consistent, and `x.equals(null)` must be false.

Violating the hash side breaks every hash-based collection: you put an object into a `HashMap` and lookups miss it, because the map computes a bucket from the hash and never even reaches your `equals`. Violating symmetry or transitivity typically happens when you subclass and add a field to `equals` — `parent.equals(child)` returns true but `child.equals(parent)` returns false, which silently corrupts `List.contains`, `Set` deduplication and JPA collections.

**Why it matters.** The classic senior trap is mutability: if you mutate a field that participates in `hashCode` after inserting into a `HashSet`, the object is stranded in the wrong bucket. It's in the set, but `contains` says no, and it will never be garbage collected via that set. Use immutable value objects as keys, or exclude mutable fields from the hash.

**Follow-up: How do you write `equals` for a class hierarchy?**
Either use `getClass() != o.getClass()` (breaks Liskov, but preserves symmetry) or `instanceof` plus a `canEqual`-style check as in Scala. In practice the honest senior answer is: favour composition over inheritance for value types, and use `record` in modern Java so the compiler generates a correct implementation.

**Follow-up: Is `Objects.hash(...)` a good default?**
It's correct and readable, but it allocates a varargs array and boxes primitives, so on a very hot path (millions of map lookups per second) hand-roll the `31 * result + field` form. Measure before you do this — it's usually noise.

---

### Q2. `==` vs `equals`, and how does the string pool complicate it?

**Answer.** `==` compares references for objects and values for primitives. `equals` compares logical state. For strings, compile-time constants are interned into the string pool, so `"abc" == "abc"` is true, but `new String("abc") == "abc"` is false, and `("ab" + someVar) == "abc"` is false because runtime concatenation produces a new object.

**Why it matters.** Since Java 7 the string pool lives in the heap (not PermGen), so interned strings are collectible and the pool is sized by `-XX:StringTableSize`. `String.intern()` is occasionally useful for deduplicating a huge number of repeated strings read from a database or a message queue, but it's a native call into a fixed-size hash table and can become a bottleneck. The modern alternative is `-XX:+UseStringDeduplication` (G1/ZGC), which deduplicates the backing `byte[]` during GC without changing identity.

**Follow-up: Why does `Integer` behave oddly with `==`?**
`Integer.valueOf` caches −128 to 127 by default, so `Integer a = 127, b = 127; a == b` is true, but at 128 it's false. Autoboxing in comparisons is a real production bug source — always use `equals` or unbox explicitly. The cache upper bound is tunable via `-XX:AutoBoxCacheMax`.

---

### Q3. Why is `String` immutable, and what does that buy the JVM?

**Answer.** Immutability enables safe sharing: the string pool can hand the same instance to unrelated code, hash codes can be cached (`String` caches `hash` lazily), strings are inherently thread-safe with no synchronisation, and they're safe as `HashMap` keys. It's also a security property — a `String` passed as a file path or SQL fragment can't be mutated by another thread between the security check and the use (a TOCTOU attack).

**Why it matters.** The cost is garbage: every transformation allocates. That's why `StringBuilder` exists, and why Java 9 introduced compact strings (`byte[]` with a coder flag instead of `char[]`), halving memory for Latin-1 content — a big win because strings are typically 20–30% of a server heap.

**Follow-up: Why store passwords in `char[]` rather than `String`?**
Because you can zero a `char[]` immediately after use. A `String` stays in the heap until GC and will appear in any heap dump taken in between. In practice modern advice is to use a purpose-built type and clear it, and to accept that this is defence-in-depth, not a guarantee.

---

### Q4. `String` concatenation, `StringBuilder`, `StringBuffer` — what actually happens at runtime?

**Answer.** Simple concatenation in one expression is compiled away. Since Java 9, `javac` emits an `invokedynamic` to `StringConcatFactory`, which generates an optimised method handle chain at runtime — often faster than a hand-written `StringBuilder` because it can size the buffer exactly. Concatenation *inside a loop*, however, still creates a new builder per iteration and is O(n²); that's the case where you hoist a `StringBuilder` out of the loop.

`StringBuffer` is the legacy synchronised version. Use it essentially never — the synchronisation is uncontended in practice and just adds noise; if you truly need to share a mutable buffer across threads, you need coarser locking anyway.

**Why it matters.** Interviewers want to hear "I know the compiler optimises the simple case" rather than a rote "always use StringBuilder", which is a mid-level answer.

**Follow-up: How would you pre-size a `StringBuilder`?**
Estimate the final length and pass it to the constructor. The default is 16 chars, and each growth is a `Arrays.copyOf` at roughly 2n+2. For a serializer producing 10KB payloads, pre-sizing removes ~10 array copies per call.

---

### Q5. How do you design a properly immutable class?

**Answer.** Five rules: make the class `final` (or all constructors private with static factories) so no one subclasses and adds mutability; make all fields `private final`; don't expose setters; defensively copy mutable inputs in the constructor; and defensively copy mutable state on the way out of getters.

```java
public final class Order {
    private final String id;
    private final List<Line> lines;
    private final Date placedAt; // legacy API, mutable

    public Order(String id, List<Line> lines, Date placedAt) {
        this.id = Objects.requireNonNull(id);
        this.lines = List.copyOf(lines);          // defensive copy + unmodifiable
        this.placedAt = new Date(placedAt.getTime()); // defensive copy
    }
    public List<Line> lines() { return lines; }   // already unmodifiable
    public Date placedAt() { return new Date(placedAt.getTime()); }
}
```

**Why it matters.** Immutability gives you free thread safety and safe publication via final field semantics — the JMM guarantees that a thread which sees a reference to a correctly constructed object sees its final fields fully initialised, without synchronisation.

**Follow-up: Does `record` give you all of this?**
No. Records give you final fields and generated accessors, but they don't deep-copy. A `record Order(List<Line> lines)` still exposes the caller's mutable list. Add a compact constructor that copies: `Order { lines = List.copyOf(lines); }`.

**Follow-up: What if the object is huge and copying is expensive?**
Use persistent/structural-sharing data structures, or a copy-on-write builder, or accept a documented "caller must not mutate" contract at a trusted internal boundary. Never at a public API boundary.

---

### Q6. Overloading vs overriding — and what is dispatched when?

**Answer.** Overloading is resolved statically at compile time based on the *declared* types of the arguments. Overriding is resolved dynamically at runtime based on the actual object type via the vtable. So:

```java
void f(Object o) { print("Object"); }
void f(String s) { print("String"); }

Object o = "hello";
f(o); // prints "Object" — chosen at compile time
```

**Why it matters.** This is where subtle bugs live, especially with `null` (the most specific applicable overload wins, so `f(null)` picks `String`), with autoboxing (widening beats boxing beats varargs), and with `remove(int)` vs `remove(Object)` on `List<Integer>` — a genuine production bug I'd expect a senior to have hit.

**Follow-up: Can you override a static method?**
No — you hide it. The call is bound to the compile-time class, so `Parent p = new Child(); p.staticMethod()` runs the parent's version. Same for private methods and fields (fields are never polymorphic).

**Follow-up: Can you narrow the return type when overriding?**
Yes, covariant return types are allowed since Java 5. You may also widen access, and you may throw fewer or narrower checked exceptions, but never broader ones.

---

### Q7. Abstract class vs interface in modern Java — when do you choose which?

**Answer.** Since Java 8, interfaces can have `default` and `static` methods, and since Java 9 `private` methods, so the capability gap has narrowed. What remains: abstract classes can hold mutable instance state, non-public constructors, and protected members, and give you single inheritance. Interfaces give multiple inheritance of *type* and *behaviour* but not state.

My rule: an interface defines a *role* or capability, so it should be the default for public API boundaries. An abstract class is an implementation-sharing device — use it when subclasses genuinely share state and construction logic, and prefer to make it package-private.

**Why it matters.** `default` methods were added to allow interface evolution without breaking implementors (that's how `Collection.stream()` shipped). They were not intended as a general mixin mechanism, and using them for stateful behaviour is a smell.

**Follow-up: How does Java resolve the diamond problem with default methods?**
Three rules: (1) class wins over interface; (2) the most specific interface wins; (3) if it's still ambiguous, the code doesn't compile and you must disambiguate with `Interface.super.method()`. Java deliberately refuses to guess.

---

### Q8. What is the class initialisation order, and when is a class actually initialised?

**Answer.** Loading → linking (verify, prepare, resolve) → initialisation. Initialisation runs static initialisers and static field assignments *in source order*, and happens lazily at the first "active use": creating an instance, calling a static method, assigning or reading a non-constant static field, or reflection. Reading a `static final` compile-time constant does *not* trigger initialisation — it's inlined at the call site.

For instances: super constructor → instance initialiser blocks and field initialisers in source order → constructor body.

**Why it matters.** Two traps. First, calling an overridable method from a constructor executes the subclass override before the subclass fields are initialised, so you see nulls and zeros. Second, `static final` constant inlining means if you change a constant in library A and don't recompile consumer B, B keeps the old value.

**Follow-up: How does class initialisation interact with deadlocks?**
The JVM holds a per-class initialisation lock. If two threads initialise two classes whose static initialisers reference each other, you get a genuine deadlock that no thread dump will explain nicely (you'll see threads parked in `<clinit>`). Keep static initialisers trivial.

---

### Q9. `finalize()` is deprecated — what replaces it?

**Answer.** `finalize` was deprecated for removal in Java 9/18. It was unpredictable (no ordering, no timing guarantee, may never run), it resurrects objects, it adds a GC pass, and an exception inside it is swallowed. The replacements are: `try-with-resources` with `AutoCloseable` for deterministic cleanup — this is the right answer 95% of the time — and `java.lang.ref.Cleaner` for a safety-net for native resources.

```java
public class NativeBuffer implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();
    private final Cleaner.Cleanable cleanable;
    NativeBuffer(long addr) {
        // NOTE: state must NOT reference the outer object, or it never becomes unreachable
        cleanable = CLEANER.register(this, new State(addr));
    }
    public void close() { cleanable.clean(); }
    private record State(long addr) implements Runnable {
        public void run() { free(addr); }
    }
}
```

**Why it matters.** The comment in the code is the whole point — the classic mistake is capturing `this` in the cleanup action, which keeps the object permanently reachable.

**Follow-up: What's a `PhantomReference` used for here?**
`Cleaner` is built on phantom references. A phantom reference's `get()` always returns null, so it can't resurrect the object; it's enqueued *after* the object is finalisable, which makes it the correct primitive for post-mortem cleanup.

---

### Q10. Checked vs unchecked exceptions — what's your position?

**Answer.** Checked exceptions were designed to force callers to handle recoverable conditions. In practice they compose badly: they leak implementation details up through abstractions, they interact painfully with lambdas and streams (functional interfaces don't declare them), and they lead to `catch (Exception e) { throw new RuntimeException(e); }` noise.

My position: use unchecked exceptions for programming errors and for anything the immediate caller cannot meaningfully recover from — which is most things in a service. Use checked exceptions sparingly at true boundaries where the caller has a real alternative action. Whatever you choose, define a small domain exception hierarchy rather than throwing raw `RuntimeException`.

**Why it matters.** Interviewers want to see you've formed a view and can defend it, and that you know Kotlin, Scala and Spring all went unchecked. Note the honest counterargument: unchecked exceptions make it possible to silently forget an error path, so you compensate with a global handler and good observability.

**Follow-up: How do you handle checked exceptions inside a stream?**
Either wrap in a helper that converts to unchecked, or use a `Try`/`Either` result type, or use `mapMulti`/loops for genuinely error-prone stages. Never swallow.

**Follow-up: What's wrong with catching `Throwable`?**
It catches `Error` — `OutOfMemoryError`, `StackOverflowError`, `LinkageError` — which you cannot recover from and which you'll now hide. Catching `InterruptedException` and ignoring it is the other cardinal sin (see Q68).

---

### Q11. Explain try-with-resources and suppressed exceptions.

**Answer.** Any `AutoCloseable` declared in the resource clause is closed in reverse order of declaration, and closing happens *before* any `catch`/`finally` block runs. If the body throws and `close()` also throws, the body's exception propagates and the close exception is attached via `addSuppressed`, retrievable through `getSuppressed()`.

That's the key improvement over the old pattern, where a failing `close()` in a `finally` block would mask the original exception — the actual cause of the outage would vanish from your logs.

**Why it matters.** Since Java 9 you can reference an existing effectively-final variable directly: `try (conn) { ... }`.

**Follow-up: What if `close()` is idempotent-unsafe?**
`AutoCloseable` explicitly does not require idempotency, but `Closeable` does. Always make your own `close()` idempotent — frameworks and try-with-resources nesting will call it twice eventually.

---

### Q12. Cloning: `Cloneable`, copy constructors, serialization round-trips.

**Answer.** `Cloneable` is a broken design: it's a marker interface with no `clone()` method, `Object.clone()` is protected and native, it bypasses constructors (so final fields and invariants are not enforced), and the default is a shallow copy. Josh Bloch's advice — which I follow — is to prefer a copy constructor or a static factory `Foo.copyOf(foo)`.

For deep copies, the options are: hand-written recursive copy (fastest, most maintainable), serialization round-trip (slow, fragile, and a security risk with untrusted data), or a mapping library. In practice, designing for immutability removes most of the need for copies at all.

**Follow-up: How do you deep copy a collection of mutable objects cheaply?**
Usually you don't — you make the elements immutable so a shallow copy is a correct deep copy. That's the senior move: change the design instead of writing a copier.

---

### Q13. What are records and what are their exact semantics?

**Answer.** A `record` is a transparent carrier for immutable data. The compiler generates: a canonical constructor, private final fields, accessors named after components (no `get` prefix), plus `equals`, `hashCode` and `toString` derived from all components. Records are implicitly final, cannot extend a class (they extend `java.lang.Record`), but can implement interfaces and have static members and additional constructors.

Validation and normalisation go in a compact constructor:

```java
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        Objects.requireNonNull(currency);
        if (amount.scale() > currency.getDefaultFractionDigits())
            throw new IllegalArgumentException("too many decimals");
        amount = amount.stripTrailingZeros(); // reassigning the parameter is allowed here
    }
}
```

**Why it matters.** Records shine as DTOs, value objects, map keys, and — combined with sealed interfaces — as algebraic data types for pattern matching.

**Follow-up: When is a record the wrong choice?**
When you need mutability, when you need to hide or derive representation (the accessors expose your components as API forever), when you need JPA entities (which need a no-arg constructor and mutable identity), or when component-based `equals` is semantically wrong — e.g. a domain entity whose identity is its ID alone.

**Follow-up: Can you customise a record's accessor?**
Yes, you can override any generated member. A common use is returning a defensive copy: `public List<Line> lines() { return List.copyOf(lines); }`.

---

### Q14. Explain the `static` keyword's four uses and the gotchas of each.

**Answer.** Static fields (one per class, per classloader), static methods (no dispatch, no `this`), static nested classes (no implicit outer reference), and static initialiser blocks.

The gotchas: static mutable state is a global variable — it breaks testability, creates hidden coupling, and is a thread-safety hazard. Non-static inner classes hold an implicit reference to the outer instance, which is a classic memory leak (an inner-class `Runnable` submitted to a long-lived executor pins its outer object). And "one per class per classloader" matters in application servers and plugin systems, where the same class loaded twice has two independent statics.

**Follow-up: How do you make a thread-safe lazy singleton?**
The holder idiom, which uses the JVM's class initialisation lock:

```java
private static class Holder { static final Config INSTANCE = load(); }
public static Config get() { return Holder.INSTANCE; }
```
Or just an `enum` singleton, which is also serialization-safe. In a Spring application, let the container manage it and inject it — that's testable, which a static singleton isn't.

---

## 2. Generics

### Q15. What is type erasure and what are its practical consequences?

**Answer.** Generics are compile-time only. The compiler checks types, inserts casts, and then erases type parameters to their bound (`Object` for unbounded). At runtime `List<String>` and `List<Integer>` are the same class.

Consequences: you can't do `new T()`, `T[]`, `instanceof List<String>`, or `catch (MyException<T> e)`. You can't overload on `List<String>` and `List<Integer>` — same erasure. Static fields are shared across all parameterisations. And generics can't use primitives, hence boxing costs.

**Why it matters.** Erasure was chosen for migration compatibility: Java 5 generic code had to interoperate with Java 1.4 collections, which is also why raw types still compile with a warning. C# reified generics instead and broke compatibility.

**Follow-up: How do you get the type at runtime if you need it?**
Pass a `Class<T>` token explicitly (`Foo(Class<T> type)`), which is what Spring, Jackson and JPA do. Or use the super-type token trick: an anonymous subclass captures its generic superclass signature in the class file, readable via `getGenericSuperclass()` — that's how Jackson's `TypeReference` and Guice's `TypeLiteral` work. Class-level generic signatures *are* retained in metadata; it's only the runtime instance that loses them.

**Follow-up: Does Project Valhalla change this?**
It's aiming at generic specialisation over value types, which would let `List<int>` avoid boxing. Not shipped as of Java 21; value classes are still in preview/incubation.

---

### Q16. Explain PECS and when you'd use each wildcard.

**Answer.** Producer Extends, Consumer Super. `? extends T` when the structure only produces T (you read from it), `? super T` when it only consumes T (you write to it), and an exact type when it does both.

```java
public static <T> void copy(List<? super T> dest, List<? extends T> src) { ... }
```

You can't add anything but `null` to a `List<? extends T>`, because the compiler can't know whether the actual type is `List<Dog>` or `List<Cat>`. You can add T and its subtypes to a `List<? super T>`, but reading gives you `Object`.

**Why it matters.** This is really about variance. Java arrays are covariant and therefore unsound — `Object[] a = new String[1]; a[0] = 1;` compiles and throws `ArrayStoreException` at runtime. Generics chose invariance for soundness, and wildcards give back the flexibility explicitly.

**Follow-up: Why is `Comparator<? super T>` used everywhere in the JDK?**
So a `Comparator<Animal>` can sort a `List<Dog>`. The comparator consumes T, so `super` is correct by PECS. Look at `Collections.sort`, `Stream.sorted`, `TreeMap`'s constructor.

**Follow-up: When should a public API use a wildcard vs a type parameter?**
Rule of thumb: if a type parameter appears only once in the signature, replace it with a wildcard — it's simpler for callers. If it appears in more than one place and the relationship matters, you need a named type parameter.

---

### Q17. Why can't you create a generic array, and how do you work around it?

**Answer.** `new T[10]` is illegal because arrays are reified — they check their component type at runtime — while T is erased, so the check would be meaningless and heap pollution would go undetected. The workaround is `(T[]) new Object[10]` with `@SuppressWarnings("unchecked")`, kept strictly private so the array never escapes as `T[]` (that would throw `ClassCastException` at the caller's cast). This is exactly what `ArrayList` does internally.

The alternative, used by `toArray(T[])` and `Arrays.copyOf`, is to take a `Class<T>` or an array instance and use `java.lang.reflect.Array.newInstance`.

**Follow-up: Why does `list.toArray(new String[0])` outperform `new String[list.size()]`?**
Counter-intuitively, the zero-length version is typically faster on modern JITs: allocating a zero-length array is nearly free and JIT intrinsics handle the internal allocation without zeroing it twice. It's also immune to a race where the list shrinks between `size()` and the copy.

---

### Q18. What is heap pollution and what does `@SafeVarargs` do?

**Answer.** Heap pollution is when a variable of parameterised type refers to an object that isn't of that type — possible because of erasure and unchecked casts. Generic varargs are the common source: `void f(List<String>... lists)` creates a `List<String>[]`, which can't truly exist, so the compiler warns at every call site.

`@SafeVarargs` suppresses that warning and asserts that the method doesn't store anything into the array or let it escape. It's allowed only on static, final, or private methods (and constructors) — i.e. methods that can't be overridden by something unsafe.

**Follow-up: Show a violation.**
```java
@SafeVarargs // a lie
static <T> T[] toArray(T... args) { return args; }
static <T> T[] pick(T a, T b) { return toArray(a, b); } // creates Object[] at runtime
String[] s = pick("x", "y"); // ClassCastException
```
The lesson: never return or store the varargs array.

---

### Q19. What are bridge methods?

**Answer.** Synthetic methods the compiler generates to preserve polymorphism after erasure. If `Child implements Comparable<Child>` with `compareTo(Child)`, the erased interface method is `compareTo(Object)`, so the compiler emits a bridge `compareTo(Object)` that casts and delegates. Same for covariant return types.

**Why it matters.** They show up in stack traces, they confuse reflection (`getDeclaredMethods` returns them — check `Method.isBridge()` or `isSynthetic()`), and they're the reason a `ClassCastException` sometimes appears in a method you never wrote.

---

### Q20. Explain recursive generic bounds — `<T extends Comparable<T>>`.

**Answer.** A self-referential bound constrains T to be comparable to itself, which is how you express "must be orderable against its own type". You see it in `Collections.max` and in the enum declaration `Enum<E extends Enum<E>>`.

The more general use is the self-typed builder pattern, so fluent methods return the subclass type:

```java
abstract class Builder<T extends Builder<T>> {
    T name(String n) { this.n = n; return self(); }
    protected abstract T self();
}
```

**Why it matters.** The JDK actually declares `<T extends Comparable<? super T>>` — the `super` matters so that a `Timestamp extends Date` can be sorted using `Date`'s comparison. Being able to explain that extra `? super` is a strong senior signal.

---

### Q21. How does type inference work for generic methods, and where does it fail?

**Answer.** Java infers type arguments from the arguments, the target type of the assignment (poly expressions, since Java 8), and the bounds. Java 8's improved target typing is why `List<String> l = Collections.emptyList();` compiles but `foo(Collections.emptyList())` may still need an explicit witness `Collections.<String>emptyList()` when the parameter is overloaded.

Failure cases: chained generic calls where an intermediate result has no target type; conditional expressions mixing types (which infer an lub like `Object & Serializable & Comparable<?>`); and `var` combined with diamond, where `var x = new ArrayList<>();` infers `ArrayList<Object>` — almost never what you meant.

**Follow-up: What's your rule on `var`?**
Use it when the right-hand side makes the type obvious (`var repo = new CustomerRepository()`, or a loop over a well-named collection). Avoid it when the RHS is a factory or generic method whose return type isn't visible at the call site, and never let it hide a raw or `Object` inference.

---

## 3. Collections

### Q22. Walk me through `HashMap` internals in Java 8+.

**Answer.** An array of buckets, sized to a power of two. `hash(key)` is `h ^ (h >>> 16)` — spreading the high bits down so that the index calculation `hash & (n-1)`, which only uses low bits, still benefits from the whole hash. Each bucket is a linked list; when a bucket reaches 8 entries **and** the table is at least 64 slots, it converts to a red-black tree, degrading worst-case lookup from O(n) to O(log n). It untreeifies below 6 (hysteresis prevents thrashing). Below table size 64 it resizes instead of treeifying, because the real problem is usually a small table.

Default capacity 16, load factor 0.75; resize doubles capacity and rehashes. Java 8 splits each bucket into a "lo" and "hi" list using `hash & oldCap`, so entries move to either index `i` or `i + oldCap` with no rehash computation and preserved relative order.

**Why it matters.** The treeify feature exists because of hash-collision DoS attacks (CVE-2011-4858) — an attacker sending crafted keys as JSON fields could turn every request into O(n²).

**Follow-up: What does treeification require of the keys?**
It uses `Comparable` if the keys implement it; otherwise it falls back to comparing class names and `System.identityHashCode` for a stable tie-break. So non-comparable keys still get a tree, just with a weaker ordering.

**Follow-up: How do you size a `HashMap` you know will hold 1,000 entries?**
`new HashMap<>(1000 / 0.75f + 1)` — or in Java 19+, `HashMap.newHashMap(1000)`, which does the arithmetic for you. Otherwise you'll pay several resizes and rehashes.

---

### Q23. What actually goes wrong if you use `HashMap` from multiple threads?

**Answer.** Three failure modes, in ascending order of nastiness. Lost updates — two puts to the same bucket, one wins. Stale reads — no happens-before, so a thread may never see another's write. And structural corruption during concurrent resize: in Java 7 the transfer loop reversed the list and could produce a cycle, making `get()` spin at 100% CPU forever. Java 8's split-list resize removed the cycle, but you can still get lost entries and infinite loops in edge cases — it is not safe, just less spectacularly unsafe.

**Why it matters.** The Java 7 infinite loop is a famous production incident: an unrelated hung service, no exception, just a pegged core. Being able to describe it shows you've debugged real systems.

**Follow-up: What is a fail-fast iterator?**
Iterators over `ArrayList`/`HashMap` track a `modCount`; if it changes during iteration, they throw `ConcurrentModificationException` on the next `next()`. It's a best-effort bug detector, not a synchronisation mechanism — it's not guaranteed to fire, and it fires for single-threaded mistakes too (removing from a list while iterating it). Use `Iterator.remove()` or `removeIf`.

---

### Q24. `ConcurrentHashMap` vs `Collections.synchronizedMap` vs `Hashtable`.

**Answer.** `Hashtable` and `synchronizedMap` use a single lock for the whole map — every operation serialises, and compound operations still need external locking. `ConcurrentHashMap` in Java 8 dropped segments entirely: it uses a CAS to install the first node in an empty bin, and `synchronized` on the bin's head node for subsequent writes. Reads are lock-free because nodes have `volatile` value and next pointers. Resizing is cooperative — multiple threads help transfer ranges of the table.

Its iterators are weakly consistent, not fail-fast: they never throw CME, they reflect the state at some point at or since creation, and each element is returned at most once. `size()` is an estimate (it uses a striped `LongAdder`-style counter).

**Follow-up: Why doesn't it allow null keys or values?**
Because `get()` returning null would be ambiguous — absent, or present-with-null? — and you can't disambiguate with a follow-up `containsKey` in a concurrent map without a race. `Doug Lea`'s stated reasoning. Use `Optional` or a sentinel.

**Follow-up: How do you do a thread-safe "get or compute"?**
`computeIfAbsent`, which is atomic per key. But the mapping function runs while holding the bin lock, so it must be short, must not block, and must not modify the same map — recursive `computeIfAbsent` on the same map can deadlock or corrupt state (fixed to throw `IllegalStateException` in later versions, but still a design error).

---

### Q25. `ArrayList` vs `LinkedList` — give me the real answer.

**Answer.** Use `ArrayList` essentially always. The textbook answer is "LinkedList is O(1) insert/delete" but that's O(1) *given a node reference*; getting there is O(n). Meanwhile `ArrayList`'s `System.arraycopy` on a contiguous array is extremely fast, and — the decisive factor — it is cache-friendly. `LinkedList` allocates a node object per element (24+ bytes of overhead each), scatters them across the heap, and every traversal is a pointer chase and a cache miss. Benchmarks routinely show `ArrayList` winning even for middle insertion at realistic sizes.

`LinkedList`'s only real justification is as a `Deque`, and `ArrayDeque` beats it there too.

**Why it matters.** This question tests whether you reason about hardware or recite Big-O. Big-O ignores constant factors and memory hierarchy, which dominate at real sizes.

**Follow-up: When would you use `CopyOnWriteArrayList`?**
Read-dominated, small collections with rare writes — the canonical case is a listener/observer registry. Every write copies the whole array, so writes are O(n) and it's terrible for anything write-heavy. Its iterators are snapshot-based and never throw CME.

---

### Q26. Explain `Comparable` vs `Comparator` and the contract you must not break.

**Answer.** `Comparable` is the natural ordering baked into the type; `Comparator` is an external, swappable strategy. The contract: `sgn(compare(x,y)) == -sgn(compare(y,x))`, transitivity, and consistency (`compare(x,y)==0` implies equal comparisons against any z). It's strongly recommended — though not required — to be consistent with `equals`; `TreeMap` and `TreeSet` use `compareTo`, not `equals`, so an inconsistent ordering makes a `TreeSet` behave differently from a `HashSet` for the same data.

**Why it matters.** Violate transitivity and TimSort throws `IllegalArgumentException: Comparison method violates its general contract!` — a runtime crash that only appears at certain input sizes, because TimSort only detects it during merging of long runs. The usual culprits are comparators using subtraction on ints (overflow: `Integer.MIN_VALUE - 1`) or returning inconsistent results for equal elements.

**Follow-up: How do you build a multi-key comparator safely?**
`Comparator.comparing(Order::customer).thenComparing(Order::amount).reversed()`, with `nullsFirst`/`nullsLast` for nullable keys and `comparingInt`/`comparingLong` to avoid boxing on hot paths. Never `a.getX() - b.getX()`; use `Integer.compare`.

---

### Q27. When would you reach for the less common `Map` implementations?

**Answer.**
- `LinkedHashMap` — predictable iteration order; with `accessOrder=true` and an overridden `removeEldestEntry` it's a 5-line LRU cache.
- `TreeMap`/`NavigableMap` — sorted, plus `floorKey`, `ceilingKey`, `subMap`, `headMap`. Ideal for range queries: rate-limit buckets by timestamp, tiered pricing lookups, IP-range tables.
- `EnumMap` — backed by an array indexed by ordinal; extremely fast and compact. Use it whenever the key is an enum. `EnumSet` similarly is a bitmask.
- `IdentityHashMap` — reference equality, used for object graph traversal / cycle detection in serializers.
- `WeakHashMap` — keys are weakly referenced, so entries disappear when the key is otherwise unreachable. Useful for metadata keyed on class objects; dangerous if values strongly reference their keys (the entry never clears).

**Follow-up: Write the LRU cache.**
```java
new LinkedHashMap<K,V>(16, 0.75f, true) {
    protected boolean removeEldestEntry(Map.Entry<K,V> e) { return size() > MAX; }
};
```
Note it's not thread-safe — even `get` mutates order — so wrap it or use Caffeine in production.

---

### Q28. `List.of` vs `Arrays.asList` vs `Collections.unmodifiableList` — what's the difference?

**Answer.** `Arrays.asList` returns a fixed-size view *backed by the array*: `set` works and writes through to the array, `add`/`remove` throw. `Collections.unmodifiableList` is an unmodifiable *view* of a mutable list — the underlying list can still change beneath you, so it's not immutable. `List.of` (Java 9) is a genuinely immutable collection: no writes at all, rejects nulls, and has a compact memory layout with special-cased implementations for 1 and 2 elements.

**Why it matters.** "Unmodifiable view" vs "immutable" is a real distinction that causes bugs — returning `unmodifiableList(this.internal)` from a getter still lets callers observe your later mutations.

**Follow-up: Gotchas with `List.of`?**
It throws on null elements and on `contains(null)`; `Collectors.toList()` returns a mutable list while `toUnmodifiableList()`/`Stream.toList()` do not (and `Stream.toList()` *does* allow nulls, unlike `List.of`). Those inconsistencies bite during migrations.

---

### Q29. What are sequenced collections (Java 21)?

**Answer.** JEP 431 added `SequencedCollection`, `SequencedSet` and `SequencedMap` to fill a long-standing gap: there was no common way to ask any ordered collection for its first or last element. `LinkedHashSet` had no `getFirst()`; `Deque` had a different vocabulary from `List`.

Now you get `addFirst`, `addLast`, `getFirst`, `getLast`, `removeFirst`, `removeLast`, and `reversed()` — which returns a *view*, not a copy, so mutations write through. `SequencedMap` adds `firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, and `sequencedKeySet()`.

**Why it matters.** It's mostly ergonomics, but `list.reversed()` as an O(1) view replaces `Collections.reverse` copies, and retrofitting these interfaces onto `List`, `Deque`, `LinkedHashSet` and `SortedMap` was a non-trivial compatibility exercise worth mentioning.

---

### Q30. Which `BlockingQueue` do you choose, and why does it matter for backpressure?

**Answer.**
- `ArrayBlockingQueue` — bounded, single lock, array-backed, optional fairness. Predictable memory.
- `LinkedBlockingQueue` — optionally bounded (default `Integer.MAX_VALUE` — effectively unbounded, a trap), two locks so higher throughput under contention.
- `SynchronousQueue` — zero capacity; a handoff. Used by `newCachedThreadPool`.
- `PriorityBlockingQueue` — unbounded, ordered; no fairness for equal priorities, and starvation risk.
- `DelayQueue` — elements become available after a delay; good for scheduled retries.
- `LinkedTransferQueue` — supports `transfer()`, blocking until a consumer takes the element.

**Why it matters.** Bounding is the point. An unbounded queue converts "the downstream is slow" into "we allocate until OOM" — the queue absorbs the failure signal instead of propagating backpressure. In a payments consumer, I'd rather block or reject and let the broker retain the message than buffer 2 million events in heap.

**Follow-up: How do you apply backpressure across a network boundary?**
Bounded queues plus a rejection policy plus a client-visible 429/503 with `Retry-After`, or a pull-based protocol (Kafka consumers, reactive streams' `request(n)`) where the consumer controls the rate.

---

### Q31. How much memory does a `HashMap` entry actually cost?

**Answer.** On a 64-bit JVM with compressed oops: a `HashMap.Node` is a 12-byte header + int hash + 3 references (4 bytes each with compressed oops) = 28, padded to 32 bytes. Plus the table array slot (4 bytes), plus the key and value objects themselves. So a `Map<Integer, Integer>` with a million entries costs roughly 32 + 16 + 16 + 4 ≈ 68 MB for what is logically 8 MB of data — an 8x overhead.

**Why it matters.** This is why primitive-specialised collections (Eclipse Collections, fastutil, HPPC) exist, and why for very large maps people move off-heap or to arrays. It's also why heaps above ~32 GB get suddenly more expensive: compressed oops turn off and every reference doubles to 8 bytes.

**Follow-up: How do you measure this?**
JOL (Java Object Layout) for exact per-object sizing, or a heap dump into Eclipse MAT and look at retained size and the dominator tree.

---

### Q32. What's the risk of using mutable objects as `Set` elements or `Map` keys?

**Answer.** The element's hash is computed at insertion. Mutate a hashed field and the object is now in the wrong bucket: `contains` returns false, `remove` fails, iteration still yields it, and it leaks. Worse in a `TreeSet`, where the ordering invariant breaks and lookups return arbitrary results.

The fixes: use immutable keys; or use an identity/ID-based `equals`/`hashCode` that only uses stable fields (e.g. a business key or a database ID assigned before insertion); or remove-mutate-reinsert explicitly.

**Follow-up: How does this bite in JPA?**
Constantly. Entities added to a `HashSet` before `persist()` have a null ID; after flush the ID is populated, the hash changes, and the set is corrupted. That's why the standard advice is to base entity `equals`/`hashCode` on a natural business key or a client-generated UUID, and to return a constant `hashCode` if you must use the surrogate ID.

---

### Q33. How would you implement a bounded LRU cache with TTL from scratch?

**Answer.** `LinkedHashMap` in access order gives LRU eviction, but not TTL or thread safety. A production-shaped answer: a `ConcurrentHashMap<K, Node>` for lookup plus an intrusive doubly linked list for recency, guarded by a lock or approximated with a sampling/CLOCK policy to avoid a global lock on every read. TTL via a per-entry expiry timestamp checked lazily on read, plus a periodic sweep for entries that are never read again.

Then I'd say: I'd use Caffeine, which does exactly this with a W-TinyLFU admission policy, and beats a hand-rolled LRU on hit rate. Building it yourself is a good interview exercise and a bad production decision.

**Follow-up: Why is strict LRU hard to make concurrent?**
Because every *read* mutates shared recency state, turning a read-mostly workload into a write-mostly one. Caffeine solves this by buffering reads in ring buffers per thread and replaying them asynchronously under a try-lock.

---

### Q34. What is `Iterator` vs `Spliterator`?

**Answer.** `Spliterator` (Java 8) supports `tryAdvance` (one element), `forEachRemaining` (bulk, allowing the source to optimise), and crucially `trySplit`, which partitions the source for parallel processing. It also reports characteristics — `SIZED`, `ORDERED`, `DISTINCT`, `SORTED`, `IMMUTABLE`, `NONNULL`, `CONCURRENT`, `SUBSIZED` — that the stream pipeline uses to skip work.

**Why it matters.** Characteristics drive real optimisations: a `SIZED` and `SUBSIZED` source splits evenly, so `ArrayList` parallelises beautifully while `LinkedList` and `Stream.iterate` split terribly. If you write a custom collection and want it to parallelise, implementing `spliterator()` properly matters more than anything else.

---

### Q35. What is a fail-safe vs fail-fast iterator, and what does "weakly consistent" mean precisely?

**Answer.** Fail-fast (`ArrayList`, `HashMap`) throws `ConcurrentModificationException` on structural modification during iteration, detected via `modCount`. Fail-safe iterators come in two flavours: snapshot (`CopyOnWriteArrayList` — you iterate a frozen copy and never see concurrent updates) and weakly consistent (`ConcurrentHashMap`, `ConcurrentLinkedQueue` — you traverse live state, you may or may not see updates made after creation, you'll see each element at most once, and you never throw).

**Follow-up: Is CME a thread-safety guarantee?**
No — it's documented as best-effort and must not be relied upon for correctness. It's a debugging aid.

---

### Q36. How do you choose a collection for a hot path in a low-latency service?

**Answer.** I'd think about four things: allocation (does it box? does it allocate per operation?), memory layout (contiguous vs pointer-chasing), concurrency (is it actually shared, or can I make it thread-confined?), and the real access pattern (mostly reads? range scans? single-key lookups?).

Concretely: prefer arrays and `ArrayList` over linked structures; prefer `EnumMap`/`EnumSet` for enum keys; use primitive collections to avoid boxing garbage; make read-mostly structures immutable and publish them by volatile reference swap rather than locking; pre-size everything; and avoid iterator allocation in the innermost loop by using indexed access on `ArrayList`. Then benchmark with JMH, because most of these guesses are wrong at least a third of the time.

---

## 4. Streams & Functional Java

### Q37. How does a stream pipeline actually execute?

**Answer.** Lazily. Intermediate operations (`map`, `filter`, `sorted`) just build a linked chain of stages; nothing runs until a terminal operation (`collect`, `forEach`, `reduce`, `findFirst`) is invoked. Then the pipeline pulls elements from the spliterator and pushes each one through the whole chain — element-at-a-time, not stage-at-a-time — which means one pass over the source and no intermediate collections.

Some operations are *stateful barriers*: `sorted` and `distinct` must buffer, and `sorted` must consume everything before emitting anything. Short-circuiting operations (`limit`, `anyMatch`, `findFirst`) stop early, which is why `Stream.iterate(1, i -> i+1).filter(...).findFirst()` terminates on an infinite stream.

**Why it matters.** The element-at-a-time model explains why `list.stream().filter(...).map(...)` isn't two passes, and why side effects in a `map` are unpredictable in order.

**Follow-up: What happens if you reuse a stream?**
`IllegalStateException: stream has already been operated upon or closed`. Streams are single-use. If you need to consume twice, either collect once and stream the collection twice, or use a `Supplier<Stream<T>>`.

**Follow-up: When does a stream need closing?**
Only when it's backed by an I/O resource — `Files.lines`, `Files.walk`, `DirectoryStream`. Those must be in a try-with-resources or you leak file handles, which is a genuinely common production bug.

---

### Q38. `map` vs `flatMap` vs `mapMulti`.

**Answer.** `map` is 1→1. `flatMap` is 1→N: it takes a function returning a stream, and flattens. `mapMulti` (Java 16) is also 1→N but push-based — you get a `Consumer` and call it however many times you like, which avoids allocating a `Stream` object per element. It's a performance option for cases where most elements produce zero or one result.

```java
orders.stream().flatMap(o -> o.lines().stream()).mapToLong(Line::amountMinor).sum();
```

**Follow-up: How do you flatten an `Optional<Optional<T>>` or a stream of Optionals?**
`Optional.flatMap` for the former; `stream.flatMap(Optional::stream)` (Java 9) for the latter — cleaner than `.filter(Optional::isPresent).map(Optional::get)`.

---

### Q39. Show me a non-trivial `Collectors` usage.

**Answer.** Downstream collectors are the powerful part:

```java
Map<Currency, BigDecimal> totals = payments.stream()
    .collect(groupingBy(Payment::currency,
             mapping(Payment::amount,
             reducing(BigDecimal.ZERO, BigDecimal::add))));

Map<Boolean, Long> byStatus = payments.stream()
    .collect(partitioningBy(Payment::isSettled, counting()));

record Stats(long count, BigDecimal total) {}
Stats s = payments.stream().collect(teeing(
    counting(),
    mapping(Payment::amount, reducing(BigDecimal.ZERO, BigDecimal::add)),
    Stats::new));
```

`teeing` (Java 12) runs two collectors in one pass and merges — useful when you'd otherwise iterate twice.

**Follow-up: `groupingBy` vs `toMap` — when do they blow up?**
`toMap` throws `IllegalStateException` on duplicate keys unless you supply a merge function, and it NPEs on null values (because it uses `Map.merge`). `groupingBy` returns an empty-list-free map — a key with no matches simply isn't present, which surprises people expecting zeros. Specify the map supplier (`TreeMap::new`, `LinkedHashMap::new`) when ordering matters.

---

### Q40. When are parallel streams a good idea — and when are they a disaster?

**Answer.** They're worth it when you have: a large data set (rule of thumb, at least tens of thousands of elements times a non-trivial per-element cost), a source that splits well (arrays, `ArrayList`, `IntStream.range`, `HashMap` — not `LinkedList`, `Files.lines`, `Stream.iterate`), no shared mutable state, and a cheap merge step.

They're a disaster when: the work is I/O-bound or blocking, because parallel streams use the *shared* `ForkJoinPool.commonPool` and one slow blocking task starves every other user of that pool in the whole JVM — including other libraries and, in some containers, the framework itself. Also when the operation is order-sensitive (`forEachOrdered` serialises anyway), when the merge is expensive (`Collectors.toList` into a shared structure), or when you're already running on many concurrent request threads — you don't have spare cores to parallelise into.

**Why it matters.** The common pool defaults to `availableProcessors() - 1` threads. In a container with a CPU limit but no `-XX:ActiveProcessorCount`, older JVMs saw the host's core count and created a wildly oversized pool.

**Follow-up: Can you use a custom pool?**
Yes, by submitting the terminal operation inside a `ForkJoinPool` task: `myPool.submit(() -> stream.parallel().collect(...)).get()`. It works because the pipeline runs on the current FJ pool, but it's an undocumented implementation detail. With Java 21, a clearer answer for I/O-bound fan-out is virtual threads plus structured concurrency, not parallel streams.

---

### Q41. `reduce` vs `collect` — what are the requirements on the reducer?

**Answer.** `reduce` is for immutable accumulation and requires the accumulator to be associative, and the identity to satisfy `f(identity, x) == x`. The three-arg form additionally requires the combiner to be compatible with the accumulator. `collect` is mutable reduction — a supplier, accumulator, and combiner working on a mutable container — which avoids allocating a new object per element.

So `reduce(0, Integer::sum)` is fine; `reduce("", String::concat)` is O(n²) and should be `collect(joining())`.

**Why it matters.** Associativity isn't optional in parallel mode: subtraction and non-commutative folds give different results depending on split boundaries, and the bug only appears when the data gets big enough to split.

**Follow-up: Write a custom collector.**
```java
Collector.of(
    StringBuilder::new,                       // supplier
    (sb, s) -> sb.append(s).append(';'),      // accumulator
    (a, b) -> a.append(b),                    // combiner
    StringBuilder::toString);                 // finisher
```
Add `Collector.Characteristics.CONCURRENT`/`UNORDERED`/`IDENTITY_FINISH` only when genuinely true — `CONCURRENT` means one shared container across threads, so the accumulator must be thread-safe.

---

### Q42. What's wrong with side effects in stream operations?

**Answer.** `list.stream().map(x -> { results.add(f(x)); return x; })` is wrong for several reasons: it may not run at all (no terminal op), the order isn't guaranteed, and in parallel it races. The `forEach` terminal operation explicitly makes no ordering guarantee — use `forEachOrdered` if you need it, though at that point a loop is clearer.

Behavioural parameters should be non-interfering (don't modify the source — that's a CME or worse) and stateless. If your lambda has state, you probably want a `collect` or a plain loop.

**Follow-up: When is a plain `for` loop better than a stream?**
When you need early exit with complex conditions, when you need indices, when you're mutating, when the operation is on a hot path and you've measured allocation pressure from the pipeline, and — importantly — when the loop is simply more readable. Streams are a readability tool first.

---

### Q43. `Optional` — what are the rules you enforce in code review?

**Answer.** `Optional` was designed as a *return type* for methods that may have no result. So: don't use it for fields (it isn't `Serializable`, it adds an allocation per object), don't use it as a method parameter (overload or accept null instead), don't use it for collections (return an empty collection), and never call `get()` without `isPresent()` — use `orElseThrow()`, which self-documents.

Prefer the functional forms: `map`, `flatMap`, `filter`, `or`, `ifPresentOrElse`, `stream`. Use `orElseGet` rather than `orElse` when the default is expensive, because `orElse`'s argument is evaluated eagerly even when the value is present — a real bug when the default is a database call.

**Follow-up: Does `Optional` fix NPEs?**
Only where you use it. It makes absence explicit in a signature, which is the value. A senior answer also mentions `@Nullable` annotations with static analysis, and Kotlin's compile-time null safety as the stronger solution.

---

### Q44. What are `takeWhile`, `dropWhile`, `iterate` with a predicate, and `Stream.ofNullable`?

**Answer.** Java 9 additions. `takeWhile(p)` takes the longest prefix satisfying p and stops — unlike `filter`, which scans everything. `dropWhile(p)` drops the prefix. The three-arg `Stream.iterate(seed, hasNext, next)` is a for-loop as a stream, which finally makes bounded generated streams readable. `Stream.ofNullable(x)` gives a 0- or 1-element stream, useful inside `flatMap` to skip nulls.

**Why it matters.** `takeWhile` on an *unordered* stream takes an arbitrary prefix — it's only meaningful on ordered ones. That's a subtlety worth knowing.

---

### Q45. Explain lambdas at the bytecode level.

**Answer.** A lambda is not an anonymous class. `javac` compiles the body into a private synthetic method and emits an `invokedynamic` instruction pointing at `LambdaMetafactory`. At first execution, the bootstrap method spins up an implementation class and returns a `CallSite`; subsequent calls go straight through. Non-capturing lambdas are cached as a singleton; capturing lambdas allocate per invocation.

**Why it matters.** It means lambdas cost nothing at class-load time (no extra class file per lambda, unlike anonymous classes) but have a first-call linkage cost — one contributor to slow JVM startup, which is what CDS and AOT work targets. It also explains why lambda stack traces look so strange (`lambda$method$0`).

**Follow-up: What is "effectively final" and why is it required?**
Captured locals are copied into the lambda instance. If the local could change afterwards, the lambda would see a stale copy — Java forbids that ambiguity rather than implementing closures over mutable locals like JavaScript. The workaround (an `AtomicInteger` or a 1-element array) is legal but usually signals you want a reduction instead.

---

### Q46. What's the difference between `Function`, `BiFunction`, `Supplier`, `Consumer`, `Predicate`, `UnaryOperator` — and why so many primitive variants?

**Answer.** They're just shapes: n arguments, returns a value or not, returns boolean. `UnaryOperator<T>` is `Function<T,T>`. The primitive variants (`IntFunction`, `ToLongFunction`, `IntPredicate`, `ObjIntConsumer`...) exist because generics can't hold primitives, so a `Function<Integer,Integer>` boxes on every call. In a stream over ten million ints, that's ten million allocations.

**Follow-up: How do you write your own functional interface?**
Any interface with a single abstract method qualifies; add `@FunctionalInterface` so the compiler enforces it. Do this when the JDK shape exists but the *name* obscures intent, or when you need to declare a checked exception.

---

### Q47. Are streams slower than loops?

**Answer.** For simple operations over small collections, yes — measurably. The pipeline sets up spliterators, sinks, and megamorphic call sites; a `for` loop over an array JITs to something close to optimal. For `IntStream` over arrays the JIT often closes the gap entirely; for boxed streams and complex pipelines the overhead is real but usually a few nanoseconds per element.

My position: this virtually never matters. Write for clarity, and when a profiler shows a stream pipeline in your top frames on a hot path, rewrite that specific loop. The pitfalls that actually cost you are boxing, `sorted`/`distinct` buffering, and accidental parallelism — not the stream abstraction itself.

**Follow-up: How would you prove it?**
JMH with proper warmup, blackholes to prevent dead-code elimination, and `@State`-scoped inputs. Anything measured with `System.nanoTime()` around a loop is measuring the JIT warming up.

---

## 5. Concurrency

### Q48. Explain the Java Memory Model and happens-before.

**Answer.** The JMM defines when a write by one thread is visible to a read by another. Without a happens-before edge, the compiler, the JIT, and the CPU are all free to reorder, and each core may read a stale cached value — there is no guarantee your write is ever seen.

The edges that matter: program order within a thread; unlocking a monitor happens-before any subsequent lock of the same monitor; a write to a `volatile` happens-before every subsequent read of it; `Thread.start()` happens-before anything in that thread; anything in a thread happens-before another thread's successful `join()`; and the transitivity of all of the above. Plus final field semantics: a correctly constructed object's final fields are visible without synchronisation.

**Why it matters.** The senior insight is that "thread safety" is two problems, not one: mutual exclusion (atomicity) *and* visibility. Locks give you both. `volatile` gives you visibility and ordering but not atomicity. People who only think about races miss the visibility half, which produces bugs that vanish under a debugger.

**Follow-up: Give an example of a data race with no lock.**
```java
boolean running = true;      // not volatile
void run() { while (running) {} }   // may never terminate
void stop() { running = false; }
```
The JIT hoists the read out of the loop. This is not theoretical — it's the classic non-terminating worker thread.

---

### Q49. What exactly does `volatile` guarantee?

**Answer.** Three things: reads and writes are atomic even for `long`/`double` (which are otherwise permitted to tear on 32-bit); a write is immediately visible to subsequent reads (it goes to a location all threads see, and issues the right memory barriers); and it establishes ordering — no reordering of reads/writes across the volatile access, so anything written before a volatile write is visible to a thread that reads that volatile.

It does *not* give atomicity for compound actions: `count++` on a volatile is still a race, because it's read-modify-write.

**Why it matters.** The "piggyback" ordering guarantee is what makes the safe-publication idiom work: build an immutable object, then publish it via a volatile write; readers who see the reference see the fully constructed object.

**Follow-up: When would you use `volatile` in real code?**
A shutdown/`running` flag, a "state has changed, re-read config" flag, safe publication of an immutable snapshot (a config object swapped wholesale), and the double-checked locking idiom. Anything with a read-modify-write goes to an `Atomic*` or a lock.

**Follow-up: What are `VarHandle` and `Unsafe`?**
`VarHandle` (Java 9) is the supported replacement for `sun.misc.Unsafe` field access, giving explicit access modes — plain, opaque, acquire/release, volatile — plus CAS. It lets you express weaker-than-volatile ordering when you know what you're doing, which is how modern JDK internals are written.

---

### Q50. `synchronized` vs `ReentrantLock`.

**Answer.** `synchronized` is a JVM intrinsic: block-structured, automatically released on exception, no timeout, no interruption, one implicit condition variable (`wait`/`notify`), and it gets thin-lock/inflation optimisations from the JVM. `ReentrantLock` is a library class built on `AbstractQueuedSynchronizer`: it adds `tryLock()` with and without timeout, `lockInterruptibly()`, optional fairness, multiple `Condition` objects, and the ability to acquire in one method and release in another (hand-over-hand locking).

Default to `synchronized` for readability; reach for `ReentrantLock` when you need one of its specific capabilities. Always `unlock()` in a `finally`.

**Why it matters.** Performance is no longer the discriminator — since Java 6, uncontended `synchronized` is very cheap, and biased locking (which was removed in Java 15–18) was the last big gap. `tryLock` with a timeout is a genuinely useful deadlock-avoidance tool.

**Follow-up: What is fairness and why is it usually off?**
A fair lock hands ownership to the longest waiter, which avoids starvation but destroys throughput — every handoff is a context switch, and you lose barging (a thread that arrives while the lock is momentarily free can just take it). Fairness typically costs an order of magnitude in throughput. Use it only when starvation is observed and matters.

---

### Q51. How does CAS work, and what is the ABA problem?

**Answer.** Compare-and-swap is a single atomic CPU instruction (`lock cmpxchg` on x86) that sets a memory location to a new value only if it currently holds an expected value. `AtomicInteger.incrementAndGet` is a loop: read, compute, CAS, retry on failure. It's non-blocking — no thread is ever suspended — so no deadlock, but under high contention you burn CPU retrying.

ABA: thread 1 reads value A; threads 2 and 3 change it to B and back to A; thread 1's CAS succeeds even though the world changed. It matters for pointer-based lock-free structures where the node was freed and reallocated. The fix is a version stamp — `AtomicStampedReference` — or `AtomicMarkableReference`.

**Follow-up: When is `LongAdder` better than `AtomicLong`?**
Under heavy write contention. `AtomicLong` has all threads CAS-ing one cache line, so throughput collapses. `LongAdder` keeps a striped array of cells, each on its own cache line, and sums them on `sum()`. So: use `LongAdder` for metrics/counters where you write constantly and read rarely; use `AtomicLong` when you need an exact, immediately-consistent value (`sum()` is not atomic with respect to concurrent updates).

---

### Q52. `ThreadLocal` — uses and dangers.

**Answer.** It gives each thread its own copy, which is how you carry request-scoped context (MDC for logging, security principal, tenant ID, transaction) without threading it through every signature, and how you reuse non-thread-safe objects like `SimpleDateFormat`.

The danger is thread pools. Pool threads live forever, so a value set during request A is still there for request B — an information leak that in a fintech context means one customer seeing another's context. And the values are held in a `ThreadLocalMap` whose *keys* are weak but whose *values* are strong, so a value referencing an application classloader keeps that classloader alive — the classic redeploy `Metaspace` leak. Always `remove()` in a `finally`.

**Follow-up: How do virtual threads change this?**
Virtual threads are cheap and numerous, so a per-thread copy of a heavy object is now a memory problem rather than a saving. Java 21 previews `ScopedValue` as the replacement: immutable, explicitly scoped via `ScopedValue.where(KEY, v).run(...)`, automatically unbound at scope exit, and inherited cleanly by structured-concurrency children. It removes the leak, the mutability, and the unbounded lifetime in one go.

---

### Q53. How do you size a thread pool?

**Answer.** Start from Little's Law. For CPU-bound work, threads ≈ number of cores (+1 to cover page faults). For I/O-bound work, `threads = cores × targetUtilisation × (1 + waitTime/serviceTime)` — so if a call spends 100 ms waiting and 5 ms computing, the ratio is 20, and 8 cores at 90% utilisation suggests ~150 threads.

But that formula is the beginning, not the end. In practice I'd bound the pool by what downstream can take (if the database pool has 20 connections, 200 threads just queue there and add latency), measure with load tests, and use separate pools per dependency so a slow downstream can't consume every thread — a bulkhead.

**Why it matters.** The most common production failure is one shared pool + one slow dependency = total outage.

**Follow-up: Explain the `ThreadPoolExecutor` core/max/queue interaction.**
This trips up nearly everyone: the executor creates threads up to `corePoolSize`, then **queues**, and only creates threads beyond core when the queue is *full*. So with an unbounded `LinkedBlockingQueue`, `maximumPoolSize` is never reached — it's dead configuration. `Executors.newFixedThreadPool` has exactly this shape. If you want elastic growth, you need a bounded queue (or a `SynchronousQueue`, as `newCachedThreadPool` uses — which then grows without limit).

**Follow-up: Which rejection policy?**
`AbortPolicy` (default, throws) when you want to surface load shedding; `CallerRunsPolicy` for natural backpressure — the submitting thread executes the task, which slows the producer; `DiscardPolicy`/`DiscardOldestPolicy` only for genuinely droppable work like metrics. `CallerRunsPolicy` is the most useful default for ingestion pipelines, but beware: if the caller is your HTTP acceptor thread, you've just stopped accepting connections.

---

### Q54. Explain `CompletableFuture` and how you compose async work.

**Answer.** It's a `Future` you can complete manually and, more importantly, chain. The families are: `thenApply` (transform, sync), `thenCompose` (flatMap — chain another async call), `thenCombine` (join two independent futures), `allOf`/`anyOf` (fan-in), and `*Async` variants that hop to an executor.

```java
CompletableFuture<Quote> fx = supplyAsync(() -> fxClient.rate(ccy), ioPool);
CompletableFuture<Limit> lim = supplyAsync(() -> limitClient.get(id), ioPool);
return fx.thenCombine(lim, this::price)
         .orTimeout(500, MILLISECONDS)
         .exceptionally(ex -> Pricing.unavailable(ex));
```

**Why it matters.** Two things separate seniors here. First: without an explicit executor, `supplyAsync` uses the *common* ForkJoinPool — never do that for blocking I/O. Second: which thread runs a callback is subtle. `thenApply` may run on the completing thread or the caller's thread depending on timing, so any callback that blocks or does heavy work should be `thenApplyAsync` with your own pool.

**Follow-up: How do you handle errors?**
`exceptionally` (recover), `handle` (see both value and throwable), `whenComplete` (side effect, doesn't change the result). Exceptions are wrapped in `CompletionException`, so you unwrap `getCause()`. Note that `orTimeout`/`completeOnTimeout` arrived in Java 9; before that you needed a scheduled executor.

**Follow-up: In Java 21, would you still use it?**
For fan-out over I/O, virtual threads with plain blocking code and structured concurrency are simpler and produce far better stack traces. `CompletableFuture` remains right for event-driven callback pipelines and for APIs that are already async.

---

### Q55. Deadlock: define it, cause it, detect it, prevent it.

**Answer.** Four Coffman conditions must all hold: mutual exclusion, hold-and-wait, no preemption, and circular wait. Break any one and you can't deadlock.

Prevention, in order of preference: (1) impose a global lock ordering — e.g. always lock accounts by ascending account ID, which is the standard fix for the classic transfer-between-accounts deadlock; (2) reduce lock scope, or eliminate the lock with immutability or a concurrent collection; (3) use `tryLock` with a timeout and back off with jitter; (4) never call unknown/alien code (a callback, a listener) while holding a lock, because you don't know what it locks.

Detection: `jstack` or `jcmd <pid> Thread.print` — the JVM detects monitor cycles and prints "Found one Java-level deadlock" with both stacks. `ThreadMXBean.findDeadlockedThreads()` lets you detect it programmatically and alert. Note the JVM cannot detect deadlocks involving `ReentrantLock` on all paths, and it cannot detect them at all for a semaphore or a database-level lock.

**Follow-up: Show the transfer deadlock and its fix.**
```java
void transfer(Account a, Account b, long amt) {
    Account first = a.id() < b.id() ? a : b;   // consistent order
    Account second = first == a ? b : a;
    synchronized (first) { synchronized (second) { a.debit(amt); b.credit(amt); } }
}
```
If IDs can tie (same account), add a tie-breaker lock.

**Follow-up: Livelock and starvation?**
Livelock: threads are active but make no progress — two threads repeatedly backing off and retrying in lockstep. Fix with randomised backoff. Starvation: a thread never gets the resource — caused by unfair locks under sustained load or by priority inversion. Fix with fair locks or a queue.

---

### Q56. `wait`/`notify` vs `Condition` vs higher-level constructs.

**Answer.** `wait` must be called while holding the monitor, and it releases the monitor while waiting. It must **always** be in a `while` loop testing the condition, never an `if`, because of spurious wakeups and because `notifyAll` wakes threads whose condition may have been consumed by someone else. `notify` wakes one arbitrary waiter — dangerous when waiters are waiting for different conditions, so `notifyAll` is the safe default.

`Condition` (from `Lock.newCondition()`) fixes the "different conditions" problem: a bounded buffer can have separate `notFull` and `notEmpty` conditions and signal precisely, avoiding the thundering herd of `notifyAll`.

In practice I'd use neither and reach for `BlockingQueue`, `Semaphore`, `CountDownLatch`, or `Phaser`, which are correct by construction.

**Follow-up: Write a bounded buffer with `Condition`.**
```java
final Lock lock = new ReentrantLock();
final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
void put(E e) throws InterruptedException {
    lock.lock();
    try {
        while (count == items.length) notFull.await();
        items[putIdx] = e; putIdx = (putIdx+1) % items.length; count++;
        notEmpty.signal();
    } finally { lock.unlock(); }
}
```

---

### Q57. Is double-checked locking correct, and why?

**Answer.** It is correct **only** with `volatile`, and only since Java 5 when the JMM was fixed (JSR-133).

```java
private volatile Helper helper;
Helper get() {
    Helper h = helper;                    // one volatile read on the fast path
    if (h == null) {
        synchronized (this) {
            h = helper;
            if (h == null) helper = h = new Helper();
        }
    }
    return h;
}
```

Without `volatile`, the constructor's writes can be reordered after the reference assignment, so another thread can see a non-null reference to a partially constructed object. The local variable `h` isn't cosmetic — it reduces volatile reads from two to one on the hot path, a measurable win.

**Follow-up: What would you actually do?**
Use the holder idiom for a static singleton (simpler, no volatile read at all, correctness delegated to class initialisation), or `Suppliers.memoize`-style helpers. DCL is worth knowing because it explains the JMM, not because you should write it.

---

### Q58. Explain safe publication and the "escaping `this`" problem.

**Answer.** Safe publication means a reference becomes visible to other threads only after the object is fully constructed. Safe mechanisms: static initialiser, volatile or final field assignment, `AtomicReference`, or a properly synchronised collection.

`this` escapes when the constructor publishes the object before it's finished — registering a listener, starting a thread, or passing `this` to a collaborator inside the constructor, including implicitly via a non-static inner class. Another thread can then observe default field values.

```java
// broken
public Service(EventBus bus) { bus.register(this); this.config = load(); }
// fixed: private constructor + static factory that registers after construction
```

**Follow-up: What are final field semantics exactly?**
The JMM guarantees that any thread which obtains a reference to an object *through a safely published reference* sees the correctly initialised values of its final fields — no synchronisation needed. This guarantee is void if `this` escapes during construction. It's the formal reason immutable objects are thread-safe.

---

### Q59. What is `AbstractQueuedSynchronizer` and why does it matter?

**Answer.** AQS is the framework behind `ReentrantLock`, `Semaphore`, `CountDownLatch`, `ReentrantReadWriteLock`, and `FutureTask`. It maintains a single `volatile int state` plus a CLH-variant FIFO queue of waiting threads parked via `LockSupport.park`. Subclasses implement `tryAcquire`/`tryRelease` (exclusive) or the shared variants, and AQS handles queuing, parking, unparking, cancellation, and condition queues.

`state` means whatever the synchroniser wants: hold count for `ReentrantLock`, permits for `Semaphore`, remaining count for `CountDownLatch`, and for `ReentrantReadWriteLock` it's split — 16 bits of read count and 16 bits of write count, which is why you get 65535 max readers.

**Why it matters.** Knowing this lets you answer "how would you build a custom synchroniser?" and explains why `LockSupport.park`/`unpark` is the low-level primitive (it's permit-based, so an `unpark` before a `park` doesn't get lost — unlike `wait`/`notify`).

---

### Q60. Compare `CountDownLatch`, `CyclicBarrier`, `Semaphore`, and `Phaser`.

**Answer.**
- `CountDownLatch` — one-shot gate. Threads await until the count hits zero. Cannot be reset. Use: wait for N services to be ready before starting; wait for N parallel calls to finish.
- `CyclicBarrier` — N threads wait for each other, then all proceed; **reusable**, and can run a barrier action. Use: iterative simulations where every worker must finish phase k before phase k+1. If one thread fails, everyone gets `BrokenBarrierException`.
- `Semaphore` — permits. Use: limiting concurrent access to a resource, e.g. at most 10 concurrent calls to a fragile downstream — a bulkhead.
- `Phaser` — a flexible barrier where parties can register and deregister dynamically, supporting multiple phases. Use when the number of participants isn't known up front.

**Follow-up: Latch vs barrier in one sentence?**
A latch waits for *events*; a barrier waits for *parties*. And a latch can't be reused.

---

### Q61. Fork/Join: how does work stealing work and when is it right?

**Answer.** Each worker has its own deque. It pushes and pops subtasks from its own head (LIFO — good for cache locality, since the most recently split task's data is hot), and when it runs out it steals from the *tail* of another worker's deque (FIFO — stealing the oldest, largest task, which minimises steal frequency). That double-ended design is why contention is low.

It's right for divide-and-conquer CPU-bound work with a sequential threshold below which you stop splitting. It's wrong for blocking I/O, because a blocked worker doesn't yield its core — though `ManagedBlocker` exists to tell the pool to compensate by spawning another thread.

**Follow-up: How do you pick the sequential threshold?**
Empirically. A common heuristic is to target roughly 10× the parallelism in leaf tasks so stealing can balance, with each leaf doing enough work (typically ≥10k basic operations) to dwarf the ~100ns task overhead.

---

### Q62. Virtual threads in Java 21 — what are they and what changes?

**Answer.** Virtual threads (JEP 444) are lightweight threads scheduled by the JVM onto a small pool of platform carrier threads (a dedicated `ForkJoinPool`, sized to `availableProcessors` by default). When a virtual thread blocks on most JDK blocking operations — sockets, `BlockingQueue`, `Thread.sleep`, locks — the JVM *unmounts* its continuation from the carrier and frees it for another virtual thread. Stacks live on the heap and grow as needed, so a few kilobytes each rather than a 1 MB reserved stack.

The consequence is that the thread-per-request model becomes viable again at high concurrency: you write straightforward blocking code, get real stack traces, working debuggers, and working thread dumps, and the JVM handles the multiplexing that reactive frameworks were invented to do manually.

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    ids.forEach(id -> exec.submit(() -> process(id)));
}   // close() waits for all tasks
```

**Why it matters.** Virtual threads change *thread pool* thinking: you no longer pool them — they're cheap, so you create one per task. Pooling virtual threads is an anti-pattern. But you still need semaphores or rate limiters to bound concurrency against downstream resources, because unbounded concurrency just moves the queue to your database.

**Follow-up: What is pinning?**
A virtual thread that can't unmount stays pinned to its carrier, blocking it. In Java 21 this happens inside a `synchronized` block and during a native/foreign call. If your hot path synchronises around I/O — many older JDBC drivers and connection pools do — you can pin all carriers and deadlock the application. The Java 21 fix is to replace `synchronized` with `ReentrantLock` on those paths; you diagnose it with `-Djdk.tracePinnedThreads=full`. (Later JDKs have removed the `synchronized` pinning limitation, but for 21 you must design around it.)

**Follow-up: What doesn't get faster?**
CPU-bound work — you still only have N cores; virtual threads add scheduling overhead there. Also `ThreadLocal`-heavy code (memory blowup) and anything relying on thread identity for pooling or caching.

---

### Q63. What is structured concurrency?

**Answer.** A preview API in Java 21 (`StructuredTaskScope`) that gives concurrent tasks the same lifetime discipline as a block scope: tasks forked in a scope must complete before the scope exits, and the scope propagates cancellation and errors as a unit.

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User>  user  = scope.fork(() -> userService.find(id));
    Subtask<Order> order = scope.fork(() -> orderService.recent(id));
    scope.join().throwIfFailed();
    return new Page(user.get(), order.get());
}
```

If either subtask fails, the other is cancelled immediately and the scope throws — no leaked threads, no orphaned work, and the relationship shows up in thread dumps.

**Why it matters.** It solves the two classic executor problems: thread leaks (a task outliving its logical parent) and the "one fails, others keep burning resources" pattern that `CompletableFuture.allOf` doesn't give you for free. `ShutdownOnSuccess` gives you a hedged/racing call for free.

---

### Q64. Reactive programming vs virtual threads — how do you choose in 2026?

**Answer.** Reactive (Project Reactor, RxJava, WebFlux) solves two things: thread efficiency under high concurrent I/O, and *composable backpressure*. Virtual threads solve the first, much more simply — you get the same scalability with blocking code, ordinary stack traces, and debuggability, and none of the "everything must be non-blocking or you poison the event loop" discipline.

So my default for a new service in Java 21 is thread-per-request on virtual threads. I'd still pick reactive for genuine streaming pipelines with flow control, event processing with rich operators, or when the ecosystem I'm in is already reactive. The worst outcome is a half-reactive codebase where one blocking JDBC call stalls an event loop.

**Follow-up: What does that mean for an existing WebFlux codebase?**
Don't rewrite for its own sake. Migrate at natural boundaries, and audit for blocking calls with BlockHound. If most of your reactive code is a chain of `map`/`flatMap` over a single request with no fan-out, you're paying the complexity tax for nothing.

---

### Q65. Explain thread interruption properly.

**Answer.** Interruption is cooperative — a request, not a kill. `Thread.interrupt()` sets a flag. Methods that block (`sleep`, `wait`, `join`, `BlockingQueue.take`, `Lock.lockInterruptibly`) check it, throw `InterruptedException`, **and clear the flag**. Code that doesn't block must poll `Thread.currentThread().isInterrupted()`.

So the two correct responses to catching `InterruptedException` are: propagate it (declare it and rethrow), or restore the flag before handling — `Thread.currentThread().interrupt()` — so the caller can still see it. Swallowing it into a log line is the cardinal sin: you've destroyed the only signal that a shutdown was requested, and now your executor's `shutdownNow()` doesn't work.

**Follow-up: Why was `Thread.stop()` deprecated and removed?**
It threw `ThreadDeath` at an arbitrary bytecode, releasing all monitors while shared state was half-updated — leaving objects in an inconsistent state with no way to detect it. There is no safe forcible-stop primitive; cooperation is the only correct model.

**Follow-up: How do you implement clean shutdown of an executor?**
`shutdown()` (stop accepting, finish queued), then `awaitTermination(timeout)`, then `shutdownNow()` (interrupt running, return unstarted tasks), then await again and log what didn't stop. Register it as a shutdown hook or a Spring `@PreDestroy`, and make sure your tasks actually respond to interruption.

---

### Q66. `ReadWriteLock` vs `StampedLock`.

**Answer.** `ReentrantReadWriteLock` allows many readers or one writer. It's reentrant and supports downgrading (write → read) but not upgrading (which deadlocks). Under read-heavy load with short critical sections it can actually be *slower* than a plain lock, because the read lock still writes to a shared counter — a contended cache line.

`StampedLock` (Java 8) adds **optimistic reads**: you get a stamp, read fields without any write to shared state, then `validate(stamp)` to check no writer intervened; if it fails, fall back to a real read lock. That makes read-mostly access nearly free. The costs: it's not reentrant (self-deadlock if you're careless), it doesn't support `Condition`, and the optimistic block must not call arbitrary code or throw.

**Follow-up: Show the optimistic read pattern.**
```java
long stamp = lock.tryOptimisticRead();
double cx = x, cy = y;                 // read into locals
if (!lock.validate(stamp)) {
    stamp = lock.readLock();
    try { cx = x; cy = y; } finally { lock.unlockRead(stamp); }
}
return Math.hypot(cx, cy);
```

---

### Q67. What is false sharing?

**Answer.** Two independent variables that happen to sit on the same 64-byte cache line. When thread A writes one and thread B writes the other, the cache coherence protocol invalidates the whole line on the other core each time, so two logically unrelated fields ping-pong the line between cores. Throughput collapses even though there's no logical contention.

The fix is padding — put each hot field on its own line. `@jdk.internal.vm.annotation.Contended` (with `-XX:-RestrictContended`) does this automatically, and it's how `LongAdder`'s cells and the `ForkJoinPool` queues are implemented. In application code, manual padding fields or array-index striding are the practical options.

**Why it matters.** It's the canonical example of a bug you cannot see in the source code and cannot find without a profiler that reads hardware counters (`perf c2c`, Intel VTune). Mentioning it signals real low-latency experience.

---

### Q68. How do you test concurrent code?

**Answer.** Honestly: normal unit tests barely help, because a passing test proves nothing about interleavings. So I layer:

1. **Design it out** — make state immutable or thread-confined so there's less to test.
2. **Deterministic tests** — inject a controllable clock and executor (`ExecutorService` that runs inline, or a `DeterministicScheduler`) so ordering is explicit.
3. **Stress tests** — many threads, many iterations, `CountDownLatch` to start them simultaneously, assert invariants at the end. Run with `-XX:+UseSerialGC` variations and on different core counts.
4. **jcstress** — the JDK's harness for testing JMM-level outcomes; it enumerates observed result pairs across billions of runs.
5. **Static analysis** — SpotBugs, ErrorProne's `@GuardedBy` checks, and thread-safety annotations that document intent.
6. **Production observability** — thread dumps on demand, lock contention in JFR, and alerts on pool queue depth.

**Follow-up: What's a "start gate / end gate" test?**
Threads all `await()` on one latch so they begin at the same instant (maximising interleaving), then count down a second latch as they finish; the main thread awaits it and asserts. It's the standard shape for a contention test.

---

### Q69. What is a race condition vs a data race?

**Answer.** A **data race** is a JMM-level concept: two threads access the same location, at least one writes, and there's no happens-before ordering — undefined behaviour. A **race condition** is a correctness bug where the result depends on timing, and it can exist even in perfectly synchronised code.

Classic example of the second: check-then-act over a `ConcurrentHashMap`.
```java
if (!map.containsKey(k)) map.put(k, v);   // each call is atomic; the pair is not
```
Both operations are individually thread-safe, there's no data race, and the code is still wrong. The fix is a single atomic operation: `putIfAbsent` or `computeIfAbsent`.

**Why it matters.** This distinction is the point where interviewers separate "I know to add `synchronized`" from "I reason about atomicity boundaries". The real question is always: what is my unit of atomicity, and does it match my invariant?

---

### Q70. How do you diagnose a concurrency problem in production?

**Answer.** Symptom-driven:

- **Hang / no progress** → three thread dumps 10 seconds apart (`jcmd <pid> Thread.print`). Compare: threads stuck in the same frame across all three are blocked. The JVM prints detected deadlocks explicitly. Look for `BLOCKED on ... owned by`.
- **High CPU, no throughput** → `top -H` to find the hot native thread ID, convert to hex, match it to `nid=` in the thread dump. Usually a spin loop, a `HashMap` corruption, or GC.
- **Latency spikes** → JFR with lock-contention and safepoint events; look for `Java Monitor Blocked` durations and time-to-safepoint.
- **Pool exhaustion** → instrument queue depth, active count, and rejection count as metrics. A saturated pool with a healthy CPU means you're blocked downstream.
- **Intermittent wrong results** → almost always a visibility or check-then-act bug; review for missing `volatile`, non-atomic compound actions, and shared non-thread-safe objects (`SimpleDateFormat` is the perennial one).

**Follow-up: What does a thread's state tell you?**
`RUNNABLE` includes threads blocked in native I/O (misleading — a socket read shows as RUNNABLE). `BLOCKED` means waiting for a monitor. `WAITING`/`TIMED_WAITING` means `wait`, `park`, `sleep`, or `join`. So a wall of `WAITING` on a pool's queue is normal idle; a wall of `BLOCKED` on one monitor is your bottleneck.

---

## 6. JVM, Memory & Garbage Collection

### Q71. Describe the JVM memory areas.

**Answer.** Per-JVM (shared): the **heap** (all objects and arrays, divided into generations for most collectors) and **Metaspace** (class metadata — native memory since Java 8, replacing PermGen, and unbounded by default unless you set `-XX:MaxMetaspaceSize`). Per-thread: the **JVM stack** (frames with locals and operand stack, sized by `-Xss`, default ~1 MB), the **PC register**, and the **native method stack**.

Outside all of that: **code cache** (JIT-compiled native code — exhausting it silently disables the JIT and tanks performance), **direct/native memory** (`DirectByteBuffer`, Netty, memory-mapped files), GC's own structures (G1's remembered sets can be gigabytes), thread stacks, and the JVM's own C++ heap.

**Why it matters.** The senior point: `-Xmx` bounds the *heap*, not the process. A container OOM-killed at 2 GB with `-Xmx1500m` is almost always native memory — thread stacks, Metaspace, direct buffers, or a leaking native library. Use `-XX:NativeMemoryTracking=summary` and `jcmd VM.native_memory` to attribute it.

**Follow-up: How should you size a JVM in a container?**
Use `-XX:MaxRAMPercentage=70` rather than a fixed `-Xmx`, so the JVM adapts to the limit. Modern JVMs are container-aware (they read cgroup limits), but verify with `-XX:+PrintFlagsFinal` that `MaxHeapSize` and `ActiveProcessorCount` are what you expect — a CPU *limit* of 0.5 with a node of 64 cores can produce absurd GC and FJP thread counts.

---

### Q72. What does an object cost in memory?

**Answer.** A 12-byte header on a 64-bit JVM with compressed oops (mark word 8 bytes + class pointer 4), then fields, then padding to an 8-byte boundary. So `new Object()` is 16 bytes. An array adds a 4-byte length field.

References are 4 bytes with compressed oops, which the JVM enables automatically for heaps up to ~32 GB. Above that, oops become 8 bytes, and every reference-heavy structure grows — which is why a heap of 40 GB can hold *less* live data than one of 31 GB. If you need more, either stay under the threshold, use `-XX:ObjectAlignmentInBytes=16` to push the boundary to ~64 GB, or shard the process.

**Why it matters.** It explains why `Integer` boxing is so expensive (16 bytes to store 4 bytes of data, plus a pointer chase), and why primitive arrays are the right answer in memory-critical code.

**Follow-up: What lives in the mark word?**
The identity hash code (computed lazily on first `hashCode()` call), GC age bits, and locking state. That's why calling `System.identityHashCode` can prevent certain lock optimisations, and why biased locking interacted with hashing.

---

### Q73. Compare the modern garbage collectors.

**Answer.**
- **Serial** — one thread, stop-the-world. Small heaps, single core, or short-lived CLI processes. Lowest overhead per unit of work.
- **Parallel (Throughput)** — multi-threaded STW copy/compact. Highest raw throughput, longest pauses. Batch jobs where a 2-second pause is fine.
- **G1** (default since Java 9) — region-based, generational, mostly concurrent marking with STW evacuation. Targets a pause goal (`-XX:MaxGCPauseMillis`, default 200 ms) and compacts incrementally. Good general default for heaps from ~4 GB up.
- **ZGC** — concurrent, region-based, using coloured pointers and load barriers. Sub-millisecond pauses independent of heap size, scaling to terabytes. Generational since Java 21 (JEP 439), which dramatically reduced its allocation-rate overhead. Costs some throughput (~5–15%) and more memory.
- **Shenandoah** — similar goals to ZGC, concurrent evacuation with Brooks-style forwarding pointers.
- **Epsilon** — no-op collector. For benchmarking allocation rates and for short-lived jobs that will never fill the heap.

**Answer for "which do I pick?"** Latency-sensitive services with p99 requirements → ZGC (generational, Java 21). Balanced throughput/latency → G1. Batch/ETL → Parallel. Then measure: the right collector is the one that meets your SLO on your workload.

**Follow-up: Why is a generational hypothesis useful?**
Most objects die young. So collecting a small young region and copying only survivors is far cheaper than tracing the whole heap. The corollary is that GC cost scales with *live* data, not garbage — allocating lots of short-lived objects is nearly free, which is why "avoid allocation" advice is often wrong.

---

### Q74. Explain G1 in detail.

**Answer.** The heap is split into 1–32 MB regions, each dynamically labelled Eden, Survivor, Old, or Humongous. Allocation goes into Eden regions. A **young collection** is STW: it evacuates live objects out of Eden and Survivor into new Survivor/Old regions, so it compacts by construction.

Concurrently, G1 runs a marking cycle (initial mark piggybacked on a young GC, concurrent mark, remark, cleanup) to identify which old regions have the most garbage. Then **mixed collections** evacuate young regions plus a selection of the highest-garbage old regions — "garbage first". G1 uses remembered sets and a card table to track cross-region references so it can collect a region without tracing the whole heap, and a SATB (snapshot-at-the-beginning) write barrier to keep concurrent marking correct.

**Tuning knobs that actually matter:** `-XX:MaxGCPauseMillis` (a goal, not a guarantee — G1 adapts young size to meet it), `-XX:G1HeapRegionSize`, `-XX:InitiatingHeapOccupancyPercent` (when to start marking; too late → concurrent mode failure → full GC), `-XX:G1NewSizePercent`. Do **not** set `-Xmn` with G1 — it disables the adaptive sizing that makes G1 work.

**Follow-up: What's a humongous allocation and why care?**
Any object larger than half a region is allocated directly in contiguous Humongous regions, skipping Eden. They're expensive to allocate, historically only collected in the marking cycle, and cause fragmentation. If you allocate lots of big `byte[]` (say, 8 MB message payloads with a 4 MB region size), you can trigger repeated full GCs. Fix: increase `G1HeapRegionSize`, or chunk the payloads.

**Follow-up: What is a "to-space exhausted" / evacuation failure?**
G1 ran out of free regions to copy survivors into during evacuation. It has to fall back to in-place handling, which is very slow, and repeated failures degrade to a full GC. It means allocation rate outran the collector — increase heap, start marking earlier (lower IHOP), or reduce allocation.

---

### Q75. How does ZGC achieve sub-millisecond pauses?

**Answer.** By doing essentially all work concurrently with the application. Two mechanisms: **coloured pointers** — ZGC stores metadata bits (marked, remapped, finalizable) inside the 64-bit reference itself — and **load barriers** — every object reference load goes through a small barrier that checks those bits and, if the object has been relocated, fixes the pointer on the spot ("self-healing") before the application sees it.

That means relocation happens concurrently: the collector moves objects while the application runs, and any thread that touches a stale reference repairs it. The remaining STW pauses are just root scanning and handshakes, so they're bounded by the number of threads, not the heap size.

Java 21's generational ZGC adds young/old separation, so most collection work touches only the young set — this cut CPU and memory overhead substantially and is what makes ZGC a realistic default rather than a specialist tool.

**Follow-up: What are the costs?**
Load barriers cost throughput on reference-heavy workloads. Memory overhead is higher (it needs headroom to relocate into, and multi-mapped virtual memory). And coloured pointers historically limited compressed oops support. If you're throughput-bound rather than latency-bound, G1 or Parallel may serve you better.

---

### Q76. You get an `OutOfMemoryError` in production. Walk me through your response.

**Answer.** First, read the message — the variants mean different things:
- `Java heap space` — genuine heap exhaustion (leak, or under-provisioned, or one huge allocation).
- `GC overhead limit exceeded` — >98% of time in GC recovering <2% of heap; a leak in its death throes.
- `Metaspace` — class leak, usually repeated redeploys or dynamic proxy/classloader churn.
- `unable to create new native thread` — thread leak or OS limits (`ulimit -u`, `threads-max`).
- `Direct buffer memory` — leaked `DirectByteBuffer`s or `MaxDirectMemorySize` too low.
- `Requested array size exceeds VM limit` — someone tried to allocate a >2^31 element array.

Then: I want a heap dump. `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/dumps` should already be set in production — if it isn't, that's the first fix. Analyse in Eclipse MAT: run the Leak Suspects report, then look at the **dominator tree** to find what's retaining the most, and use "Path to GC Roots (exclude weak/soft)" on the biggest suspect to find who's holding it.

In parallel, restore service (restart, roll back a recent deploy, shed load) — diagnosis happens on the dump, not the live box.

**Follow-up: What are the classic leak patterns?**
Unbounded caches with no eviction; `static` collections that only ever grow; `ThreadLocal` values on pooled threads; listeners/callbacks registered and never deregistered; inner classes pinning outer objects; `ClassLoader` leaks on hot redeploy; unclosed streams and connections; and interned/`String`-keyed maps keyed on unbounded user input.

**Follow-up: Is `OutOfMemoryError` always a leak?**
No. It can be a legitimate spike — an unbounded query result, a huge upload buffered in memory, a batch job sized for last year's data. The dump tells you which: a leak shows steadily growing retained size across dumps; a spike shows one enormous transient structure.

---

### Q77. How do you read a GC log and decide whether GC is your problem?

**Answer.** Enable unified logging: `-Xlog:gc*,gc+heap=debug,safepoint:file=gc.log:time,uptime,level,tags:filecount=10,filesize=50M`. Then look at four numbers:

1. **Pause times** — the distribution, not the average. A 200 ms p99 pause on a 100 ms SLO is your answer.
2. **GC frequency / throughput %** — time in GC vs total. Above ~5–10% and you're paying real money for it.
3. **Live set after full GC** — the true working-set size. If old-gen occupancy after each collection is climbing monotonically, that's a leak.
4. **Allocation rate** (MB/s) and **promotion rate**. High allocation with low promotion is healthy (objects dying young). High promotion means objects are surviving young collections — either the young gen is too small, or you're holding references you shouldn't.

**Why it matters.** The most common misdiagnosis is "we have a GC problem" when you actually have an allocation problem or a leak. GC is a symptom reporter.

**Follow-up: What tools?**
GCEasy or GCViewer for a quick read on a log; JFR for continuous production capture; `jstat -gcutil <pid> 1s` for a live view of generation occupancy.

---

### Q78. What is a safepoint and why do safepoints cause latency spikes?

**Answer.** A safepoint is a point in execution where the JVM knows the exact state of the stack, so it can safely stop threads for GC, deoptimisation, biased-lock revocation, thread dumps, or class redefinition. The JIT inserts polls at method returns and loop back-edges. To reach a safepoint, the JVM must wait for **every** thread to arrive — that's **time to safepoint (TTSP)**.

The spike happens when one thread takes a long time to reach a poll. Classic causes: a counted `int` loop that the JIT optimised the poll out of (long-running array scan), a huge `System.arraycopy` or a `Arrays.sort` over a big array, or a page fault / swap-in during the poll. Everyone else is already stopped and waiting, so a "10 ms GC pause" can appear as 500 ms of application stall.

**Diagnosis:** `-Xlog:safepoint` shows both the operation time and the TTSP separately. Also watch for non-GC safepoint operations — `RevokeBias` (pre-Java 15), `Deoptimize`, and — a real one — `ThreadDump` if you have monitoring taking thread dumps every few seconds.

**Follow-up: What's a "guaranteed safepoint"?**
`GuaranteedSafepointInterval` (default 1s) makes the JVM take a cleanup safepoint periodically even with no GC — for counter decay, inline cache cleanup, etc. Usually harmless, occasionally the surprise in a latency histogram.

---

### Q79. Explain JIT compilation: tiered compilation, inlining, deoptimisation.

**Answer.** Methods start interpreted. The JVM counts invocations and loop back-edges; when a threshold is passed, it compiles with **C1** (fast to compile, lightly optimised, adds profiling counters), and once the profile is rich enough, with **C2** (slow to compile, aggressively optimised). That's tiered compilation, levels 0–4.

C2's most important optimisation is **inlining** — copying a callee's body into the caller, which then unlocks everything else (constant folding, escape analysis, loop optimisations). It uses the profile to make speculative decisions: a call site that has only ever seen one receiver type (monomorphic) gets inlined with a type guard.

When a speculation is violated — a new subclass appears, a never-taken branch is taken, a null shows up — the JVM **deoptimises**: it discards the compiled code, reconstructs interpreter frames, and continues. Correct, but if it happens repeatedly you get a compile/deopt loop and terrible performance.

**Why it matters.** This explains warmup: your first thousand requests run interpreted or in C1. It's why benchmarks need warmup, why "the first request after deploy times out" is normal, and why megamorphic call sites (an interface with 5 hot implementations) are much slower than monomorphic ones.

**Follow-up: How do you observe it?**
`-XX:+UnlockDiagnosticVMOptions -XX:+PrintCompilation`, or better, JITWatch on a `-XX:+LogCompilation` file. `-XX:+PrintInlining` shows what was and wasn't inlined and why ("too big", "callee is too large", "not compilable").

**Follow-up: What limits inlining?**
Method size (`MaxInlineSize` 35 bytes for cold, `FreqInlineSize` 325 bytes for hot), inlining depth, and call-site polymorphism. It's the real reason "small methods are fast" — a huge method won't be inlined into its caller.

---

### Q80. What is escape analysis and scalar replacement?

**Answer.** After inlining, C2 analyses whether an allocated object can be observed outside the current compilation unit. If it can't escape, the JVM can eliminate the allocation entirely (**scalar replacement** — the object's fields become registers/stack slots) and remove any locking on it (**lock elision**).

```java
double distance(Point a, Point b) {
    Point d = new Point(a.x - b.x, a.y - b.y); // often never actually allocated
    return Math.sqrt(d.x*d.x + d.y*d.y);
}
```

**Why it matters.** It's why "avoid allocating small temporary objects" is often bad advice — the JIT may already have removed them. But escape analysis is fragile: it depends on inlining succeeding, it gives up on complex control flow, and it doesn't apply if the object is stored in a field or passed to a non-inlined method.

**Follow-up: How do you verify it happened?**
Run with `-XX:-DoEscapeAnalysis` and compare, or use JFR/async-profiler in allocation mode (`-e alloc`) and see whether the allocation appears at all. JMH's `-prof gc` gives you normalised bytes-allocated-per-operation, which drops to zero when scalar replacement kicks in.

---

### Q81. Explain class loading and the delegation model.

**Answer.** Bootstrap (core JDK, native) → Platform (was "extension") → Application/System (classpath) → custom loaders. Each loader delegates upward first and only loads the class itself if the parent can't — which prevents application code from replacing `java.lang.String`. A class's identity is (fully qualified name, defining classloader), so the same class loaded by two loaders produces two incompatible types and a confusing `ClassCastException: com.X cannot be cast to com.X`.

Custom loaders exist for isolation (app servers, OSGi, plugin systems), hot redeploy, and instrumentation.

**Follow-up: What is a classloader leak?**
On redeploy, the old application classloader should become unreachable. If anything in a longer-lived scope holds a reference — a `ThreadLocal` on a container thread, a JDBC driver registered in `DriverManager`, a shutdown hook, an MBean, a logger, a `ThreadGroup`, a cached `Class` object in a static map in a shared library — the entire old classloader and all its classes stay alive. Redeploy a few times and Metaspace fills. Diagnosis: heap dump, find all `ClassLoader` instances, check paths to GC roots.

---

### Q82. Explain the reference types: strong, soft, weak, phantom.

**Answer.**
- **Strong** — ordinary reference; never collected while reachable.
- **Soft** — cleared at the collector's discretion when memory is tight, roughly LRU-ish. Intended for caches, but in practice they're a poor cache policy: they're cleared unpredictably, they extend GC pauses, and they delay collection of large graphs. Prefer a real bounded cache (Caffeine) with explicit eviction.
- **Weak** — cleared as soon as no strong references remain. Right for canonicalising maps and metadata keyed on objects you don't own (`WeakHashMap`, `ThreadLocalMap` keys).
- **Phantom** — `get()` always returns null; enqueued after the object is finalisable. The correct mechanism for post-mortem native cleanup, and the basis of `Cleaner`.

All of soft/weak/phantom can be registered with a `ReferenceQueue` so you're notified when they're cleared.

**Follow-up: Why is `SoftReference` for caching discouraged?**
Because the JVM decides when to clear, based on free memory rather than on hit rate or cost. Under memory pressure it may drop your most valuable entries; when memory is plentiful it may retain garbage forever. And it turns a capacity problem into a latency problem.

---

### Q83. What is direct/off-heap memory and when is it worth it?

**Answer.** `ByteBuffer.allocateDirect` allocates outside the Java heap, so I/O can read and write it without copying through the heap (avoiding a bounce buffer), and the GC never has to move or trace it. Netty, NIO, and most high-performance messaging use it heavily. `MappedByteBuffer` maps a file into the address space, letting the OS page cache do the work — the basis of Kafka's log and Chronicle Queue.

Costs: allocation is expensive (so you pool), it isn't bounded by `-Xmx` (bound it with `-XX:MaxDirectMemorySize`), and it's freed only when the buffer object is collected via a `Cleaner` — so a heap that never fills can leak native memory until the process is killed. Java 21 also offers the Foreign Function & Memory API (preview) as the modern, safer replacement for `Unsafe` here.

**Follow-up: How do you diagnose direct-memory growth?**
Native Memory Tracking (`-XX:NativeMemoryTracking=detail`, then `jcmd VM.native_memory summary.diff`), plus the `BufferPool` MBean/JFR event which reports direct buffer count and capacity. A common cause is a Netty `ByteBuf` leak — enable its leak detector at `paranoid` level in a test environment.

---

### Q84. What's your JVM production observability setup?

**Answer.** Always-on: JFR with a low-overhead profile (`-XX:StartFlightRecording=disk=true,maxsize=1g,settings=profile`) — roughly 1–2% overhead and gives you allocation profiles, lock contention, safepoints, exceptions, I/O and GC after the fact. Unified GC logging to rotating files. `HeapDumpOnOutOfMemoryError`. JMX/Micrometer exporting heap by pool, GC count/time, thread counts, class counts, and pool queue depths to Prometheus.

On-demand: `jcmd` for thread dumps, heap dumps, class histograms (`GC.class_histogram`), native memory, and VM flags. async-profiler for CPU and allocation flame graphs — it uses `AsyncGetCallTrace` so it doesn't suffer the safepoint bias that sampling-at-safepoint profilers (and older `jstack`-based tools) do.

**Why it matters.** "I'd add logging" is a junior answer. Naming JFR and safepoint bias shows you've profiled a real JVM.

**Follow-up: What is safepoint bias?**
Profilers that sample only at safepoints can only ever attribute time to safepoint-poll locations, so hot loops without polls appear free and the blame lands on the wrong method. It can make a profile confidently wrong.

---

### Q85. What causes high CPU with no obvious workload?

**Answer.** In rough order of likelihood: GC thrashing (check GC logs first — a heap near its limit spends all its time collecting); a spin loop (the `HashMap` corruption case, or a busy-wait in application or library code); regex catastrophic backtracking on user input; a `while(true)` retry with no backoff hammering a failed dependency; excessive logging (synchronous, with stack traces); JIT compiler threads recompiling in a deopt loop; and lock contention producing spin-then-park churn.

Method: `top -H -p <pid>` → hottest thread's nid → match in a thread dump. Then async-profiler flame graph over 30 seconds, which usually makes it obvious in one picture.

---

### Q86. What JVM flags do you actually set in production?

**Answer.** I'd keep the list short and justify each:

```
-XX:MaxRAMPercentage=70          # container-aware sizing
-XX:+UseZGC -XX:+ZGenerational   # or leave G1 as default; choose by SLO
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps
-XX:+ExitOnOutOfMemoryError      # let the orchestrator restart a poisoned JVM
-Xlog:gc*,safepoint:file=/logs/gc.log:uptime,level,tags:filecount=10,filesize=50M
-XX:StartFlightRecording=disk=true,maxsize=1g,settings=profile
-XX:+UseStringDeduplication      # if strings dominate the heap; measure first
-Djava.security.egd=file:/dev/urandom   # legacy startup-hang fix; check if still needed
```

Plus `-XX:ActiveProcessorCount` if the container CPU limit confuses the JVM.

**Why it matters.** The right answer includes what you *don't* set. Copying a 40-flag tuning incantation from a blog is how you end up with `-Xmn` fighting G1's adaptive sizing, or `UseParallelGC` on a latency-sensitive service. Change one flag at a time and measure.

---

## 7. Modern Java (8 → 21)

### Q87. What are sealed classes and what problem do they solve?

**Answer.** `sealed` (Java 17) lets a class or interface restrict which types may extend it, via a `permits` clause; each subtype must be `final`, `sealed`, or explicitly `non-sealed`. Permitted subtypes must be in the same module (or same package for the unnamed module).

The point is expressing a closed set of alternatives — an algebraic data type. Combined with records and pattern matching, you get exhaustive matching with compile-time checking:

```java
sealed interface PaymentEvent permits Authorised, Captured, Refunded, Failed {}
record Authorised(String id, Money amount) implements PaymentEvent {}
record Failed(String id, String reason) implements PaymentEvent {}

String describe(PaymentEvent e) {
    return switch (e) {                        // no default needed — compiler checks exhaustiveness
        case Authorised(var id, var amt) -> "auth " + id + " " + amt;
        case Captured c -> "captured " + c.id();
        case Refunded r -> "refunded " + r.id();
        case Failed(var id, var reason) -> "failed " + id + ": " + reason;
    };
}
```

**Why it matters.** Add a fifth event type and every non-exhaustive switch fails to compile. That's the payoff — the compiler becomes your checklist for a domain model change. It's the answer to "how do I model a state machine safely in Java?"

**Follow-up: When would you use `non-sealed`?**
When you want a controlled extension point: seal the top of the hierarchy, but designate one branch as open for third parties. It's a deliberate hole, and it disables exhaustiveness for that branch.

---

### Q88. Explain pattern matching for `switch` and record patterns.

**Answer.** Both finalised in Java 21. Type patterns let a `switch` match on type and bind a variable in one step. Record patterns destructure, and they nest:

```java
Object o = ...;
switch (o) {
    case Integer i when i > 100 -> big(i);          // guarded pattern
    case Integer i             -> small(i);
    case String s              -> text(s);
    case Line(Product(var sku, var price), int qty) -> total(sku, price, qty); // nested destructuring
    case null                  -> handleNull();     // null must be explicit
    default                    -> other(o);
}
```

Key semantics: order matters (patterns are tested top to bottom, and the compiler rejects a dominated case); `when` clauses add guards; `null` no longer throws NPE *if* you write a `case null`, otherwise it still throws; and for sealed hierarchies the compiler enforces exhaustiveness so you can drop `default` — which is what you want, because a `default` would silently swallow a new subtype.

**Why it matters.** This is the biggest change to how idiomatic Java is written since lambdas. It replaces visitor-pattern boilerplate and long `instanceof` chains, and it makes the "data-oriented programming" style (sealed interfaces + records + switch) practical.

**Follow-up: Doesn't this violate OO polymorphism?**
It's a different tool for a different shape of problem. Polymorphism is right when the *set of types* is open and the *set of operations* is fixed. Pattern matching is right when the set of types is closed and the operations keep growing — parsing, serialisation, event handling. That's the expression problem, and Java now supports both sides of it.

---

### Q89. Text blocks — what are the exact rules?

**Answer.** Java 15. Triple-quoted, and the compiler strips *incidental* whitespace: it computes the minimum indentation across all non-blank lines **and the closing delimiter line**, and removes that much from each. So the position of the closing `"""` controls the left margin. Trailing spaces are stripped (use `\s` to keep one). `\` at end of line suppresses the newline; `\n`, `\t` and unicode escapes still work.

```java
String json = """
    {"amount": %s, "currency": "%s"}
    """.formatted(amount, currency);
```

**Why it matters.** Mostly readability for SQL, JSON and HTML in tests. Note there's no interpolation — String Templates were previewed in Java 21 (JEP 430) but were later withdrawn and redesigned, so for 21 you use `formatted()` and you should not build production code on the preview syntax.

---

### Q90. What did JPMS (modules) actually change, and do you use it?

**Answer.** Java 9's module system adds strong encapsulation (only `exports`ed packages are accessible, enforced at runtime), explicit dependencies (`requires`), and reliable configuration (no split packages, missing dependencies fail at startup rather than at first use). It also enabled `jlink` for stripped-down custom runtimes.

Honest answer about adoption: the *JDK itself* is modularised, and that matters to everyone — it's why `--add-opens`/`--add-exports` flags exist and why reflective access to JDK internals broke. But most application code still runs on the classpath as unnamed modules, and the ecosystem largely settled on Spring Boot fat JARs + containers rather than jlink images. I use modules for libraries and for jlink-based CLI tools; for a typical Spring service, the cost/benefit is poor.

**Follow-up: What breaks when you migrate 8 → 17/21?**
Strong encapsulation of JDK internals (`sun.misc.Unsafe` partially, `sun.*` reflection) — you'll need `--add-opens` as a bridge, not a solution; removed Java EE modules (JAXB, JAX-WS, `javax.annotation`) that must now be explicit dependencies; `javax.*` → `jakarta.*` in Spring Boot 3; `SecurityManager` deprecated; removed `CMS` collector (Java 14) and the flags for it, which will refuse to start; changed default GC and default locale/charset (UTF-8 by default since Java 18 — a real behaviour change for file I/O); and stricter `--illegal-access` defaults. The reflective-access breakages usually come from old bytecode-manipulation libraries, so the practical first step is upgrading Lombok, Mockito, cglib, ASM and Jackson.

---

### Q91. What is `ScopedValue` and how does it differ from `ThreadLocal`?

**Answer.** Preview in Java 21 (JEP 446). A `ScopedValue` is bound immutably for the dynamic extent of an operation:

```java
static final ScopedValue<Principal> USER = ScopedValue.newInstance();

ScopedValue.where(USER, principal).run(() -> handleRequest());   // bound only inside
// USER.get() throws outside the scope
```

Differences: immutable (no `set` from arbitrary code), automatically unbound at scope exit (no leaks, no need for `remove()` in a `finally`), cheaper because it's a stack-shaped lookup rather than a per-thread map, and it's inherited by structured-concurrency child threads without copying.

**Why it matters.** It's the piece that makes virtual threads practical for context propagation: `InheritableThreadLocal` copies a map to every child, which is fine for 200 platform threads and disastrous for a million virtual ones.

---

### Q92. Which deprecations and removals should a senior track?

**Answer.**
- **`finalize()`** — deprecated for removal (JEP 421). Use `AutoCloseable`/`Cleaner`.
- **`SecurityManager`** — deprecated for removal in 17 (JEP 411); it never really worked for its stated threat model and is being replaced by OS/container-level isolation.
- **Applets, RMI activation, `Nashorn`, CMS GC, `Pack200`** — gone.
- **Dynamic agent loading** — warns as of 21, moving to opt-in (`-XX:+EnableDynamicAgentLoading`), which affects profilers and mocking libraries that attach at runtime.
- **`Thread.stop/suspend/resume`** — removed / throw.
- **`Object.wait(long, int)` nuances, `Integer(int)` constructors** — deprecated for removal in favour of `valueOf`.
- **`--illegal-access`** — no longer available; encapsulation is enforced.

**Why it matters.** It signals you plan upgrades rather than being surprised by them. The practical framing: run with `-Xlint:removal`, `jdeprscan`, and `jdeps --jdk-internals` before an upgrade.

---

### Q93. `java.time` — explain the type choices.

**Answer.** Pick the type by *what the value means*:
- `Instant` — a point on the UTC timeline. Use for timestamps: created_at, event time, anything you'll compare or order across systems.
- `LocalDate` / `LocalTime` / `LocalDateTime` — no timezone, no instant. Use for a birthday, a store's opening time, a contract date. `LocalDateTime` is *not* a timestamp and comparing two of them across zones is meaningless.
- `ZonedDateTime` — an instant plus a zone with DST rules. Use for "9am next Tuesday in Kuala Lumpur", i.e. future scheduling where political time rules matter.
- `OffsetDateTime` — instant plus a fixed offset, no DST rules. The right type for wire formats and database columns (`TIMESTAMP WITH TIME ZONE`).
- `Duration` (machine time, seconds/nanos) vs `Period` (human time, years/months/days). Adding one month to Jan 31 is a `Period` operation with defined truncation; adding 30 days is a `Duration`-style operation. They're different answers.

**Why it matters.** In payments, storing local times, or storing an `Instant` for a future scheduled payment, causes real incidents when a zone changes its DST rules. Rule of thumb: store `Instant`/UTC for things that happened; store local time + zone ID for things that will happen.

**Follow-up: Why was `java.util.Date` replaced?**
Mutable, not thread-safe, months are 0-based, years offset from 1900, poor timezone modelling, and `SimpleDateFormat` is famously non-thread-safe (a top-5 production bug when stored in a static field). `java.time` is immutable, thread-safe, and domain-modelled.

**Follow-up: How do you test time-dependent code?**
Inject a `java.time.Clock`. `Clock.fixed()` and `Clock.offset()` make time deterministic in tests. Never call `Instant.now()` directly in domain code.

---

### Q94. Switch expressions and `yield`.

**Answer.** Java 14. `switch` can be an expression producing a value; the arrow form has no fall-through and no `break`; multiple labels are comma-separated; and when used as an expression it must be exhaustive. Use `yield` to return a value from a block-bodied case.

```java
int days = switch (month) {
    case FEB -> isLeap ? 29 : 28;
    case APR, JUN, SEP, NOV -> 30;
    default -> { log.debug("31-day month"); yield 31; }
};
```

**Why it matters.** Exhaustiveness plus no fall-through eliminates two whole classes of bug, and it composes with sealed types (Q87). The old colon form still exists and still falls through — flag it in review.

---

### Q95. What's the state of Java's value types / Project Valhalla, and why do you care?

**Answer.** Valhalla aims to add value classes (identity-free, inlinable, "codes like a class, works like an int") and eventually generic specialisation over primitives. Not delivered in 21; still incubating.

Why it matters today: it's the reason boxing costs exist, and it shapes how you write performance-sensitive code now — primitive arrays instead of `List<Integer>`, `record` for data so it can become a value class later with minimal change, and avoiding reliance on object identity (`==`, `synchronized` on a data object) for types you'd want to be values.

---

### Q96. What is the Foreign Function & Memory API replacing?

**Answer.** JNI and `sun.misc.Unsafe`. FFM (incubating/preview through 21, `java.lang.foreign`) gives you `MemorySegment` for off-heap memory with bounds and lifetime checking via `Arena`, and `Linker`/`MethodHandle` for calling native functions without writing C glue. `jextract` generates bindings from headers.

Why a senior cares: it's the safe path for native interop and off-heap data structures, it's deterministic (an `Arena` closes and frees, no `Cleaner` guesswork), and it's how libraries will stop depending on `Unsafe` before it's removed.

---

### Q97. If you were starting a new backend service on Java 21 today, what would you use?

**Answer.** Records for DTOs and value objects; sealed interfaces + pattern matching for domain events and result types; `Optional` at return boundaries only; virtual threads with thread-per-request rather than reactive, unless there's a streaming requirement; structured concurrency (accepting it's preview) or plain executors for fan-out; `java.time` with an injected `Clock`; text blocks for SQL; and ZGC generational if latency matters, otherwise G1.

I'd deliberately *not* adopt: preview features in production code paths (string templates were withdrawn — a good lesson), JPMS for the application, or `var` in public API-shaped code where the type isn't obvious.

**Why it matters.** This question is really "have you formed judgement, or do you just know features?" Naming what you'd skip is as important as what you'd adopt.

---

## 8. Spring & Frameworks

### Q98. Why constructor injection over field injection?

**Answer.** Four reasons. The object is fully initialised and valid the moment it exists, so fields can be `final` and the class is immutable and thread-safe. It's testable without a container or reflection — `new OrderService(repo, gateway)` in a plain unit test. It makes dependencies explicit, so a constructor with 9 parameters is honest feedback that the class does too much (field injection hides that). And it fails fast on unresolvable circular dependencies at startup rather than producing a half-wired object.

Spring makes the constructor `@Autowired` implicit for a single constructor, so there's no annotation cost.

**Follow-up: When is setter injection legitimate?**
Genuinely optional dependencies, and reconfigurable ones. That's rare. `@Lazy` or an `ObjectProvider<T>` usually expresses "optional" better.

**Follow-up: What's wrong with `@Autowired` on fields, specifically?**
It requires reflection to set in tests, hides the dependency count, prevents `final`, and permits circular dependencies to silently "work" via proxying — which usually means the design is wrong.

---

### Q99. Walk through the Spring bean lifecycle.

**Answer.** Instantiate → populate properties/dependencies → `BeanNameAware`/`BeanFactoryAware`/`ApplicationContextAware` callbacks → `BeanPostProcessor.postProcessBeforeInitialization` → `@PostConstruct` → `InitializingBean.afterPropertiesSet` → custom `init-method` → `BeanPostProcessor.postProcessAfterInitialization` (**this is where AOP proxies are created**) → bean is in use → `@PreDestroy` → `DisposableBean.destroy` → custom destroy method.

Before all of that, `BeanFactoryPostProcessor`s (like `PropertySourcesPlaceholderConfigurer`) run against the bean *definitions*.

**Why it matters.** The proxy creation step explains the two most common Spring surprises: `@Transactional` and `@Async` don't work in `@PostConstruct` (the proxy doesn't exist yet from the target's perspective), and self-invocation bypasses the proxy entirely (Q101).

**Follow-up: What are the scopes?**
`singleton` (default, one per container — **not** a JVM singleton), `prototype` (new instance per lookup; note Spring does *not* call destroy callbacks on prototypes — you own their cleanup), plus web scopes `request`, `session`, `application`, `websocket`.

**Follow-up: How do you inject a prototype into a singleton?**
Not by field injection — you'd get one instance forever. Use `ObjectProvider<T>`/`ObjectFactory<T>`, a `@Lookup` method, or `@Scope(proxyMode = TARGET_CLASS)` so each call resolves a fresh instance.

---

### Q100. How does Spring AOP work, and what are its limits?

**Answer.** Spring AOP is *proxy-based*, not bytecode weaving. At bean post-processing, Spring wraps the bean in either a JDK dynamic proxy (if it implements interfaces, proxying the interface) or a CGLIB subclass proxy (otherwise — the default in Spring Boot). Calls that go *through the proxy* get the advice; calls that don't, don't.

Limits that follow directly from that: `final` classes and `final` methods can't be proxied by CGLIB; `private` methods are never advised; **self-invocation** (`this.method()`) bypasses the proxy; only Spring-managed beans are advised; and only method execution join points are supported (no field access, no constructor interception) — for those you'd need AspectJ with load-time or compile-time weaving.

**Follow-up: JDK proxy vs CGLIB — practical differences?**
JDK proxies only expose interface methods, so injecting the concrete class fails with a `ClassCastException`-style error unless you inject the interface. CGLIB subclasses the target, so it needs a non-final class, and (before Spring 6/objenesis) required a default constructor and called it twice. Spring Boot defaults to CGLIB (`proxyTargetClass=true`) to avoid the interface-injection surprise.

---

### Q101. Why doesn't `@Transactional` work when calling a method from within the same class?

**Answer.** Because the annotation is implemented by a proxy that wraps the bean. An internal `this.doWork()` call goes straight to the target object and never crosses the proxy boundary, so no transaction interceptor runs. The method appears to be transactional and silently isn't — which in a payments system means writes that should have rolled back are committed.

Fixes, in order of preference: (1) move the method to a separate bean so the call goes through a proxy — usually the right refactoring, because it reveals a genuine responsibility boundary; (2) inject a self-reference (`@Lazy MyService self`) and call `self.doWork()` — works but ugly; (3) use `TransactionTemplate` programmatically, which makes the boundary explicit and is my preference for nuanced cases; (4) AspectJ load-time weaving, which advises the real method — powerful and rarely worth the build complexity.

**Why it matters.** This is the single most common Spring bug I'd expect a senior to have found and explained to a team. The same reasoning applies to `@Async`, `@Cacheable`, `@Retryable`, `@PreAuthorize`.

**Follow-up: What else silently disables `@Transactional`?**
Applying it to a `private`, `final`, or `static` method; the class not being a Spring bean; a checked exception being thrown (by default only unchecked exceptions roll back — use `rollbackFor`); catching an exception inside the method so nothing propagates; and calling it from a `@PostConstruct`.

---

### Q102. Explain transaction propagation.

**Answer.**
- `REQUIRED` (default) — join the existing transaction, or start one. Note: an exception anywhere marks the whole thing rollback-only.
- `REQUIRES_NEW` — suspend the outer transaction and start an independent one, with its own connection. Use for audit logs or outbox writes that must survive a business rollback. Costs a second connection — deadlock risk if your pool is small and both are held.
- `NESTED` — a savepoint within the current transaction; rolling back the inner part doesn't kill the outer. JDBC-only, not supported by all JPA setups.
- `SUPPORTS` — join if one exists, else run non-transactionally.
- `NOT_SUPPORTED` — suspend and run without a transaction.
- `MANDATORY` — throw if there's no existing transaction. Great for enforcing that a repository is only called inside a service transaction.
- `NEVER` — throw if there is one.

**Follow-up: What's the `rollback-only` trap?**
Inner `REQUIRED` method throws, you catch it in the caller and continue, then commit — and get `UnexpectedRollbackException`, because the inner call already marked the shared transaction rollback-only. Fix: use `REQUIRES_NEW` for the part you intend to isolate, or don't swallow.

---

### Q103. Explain isolation levels and the anomalies they prevent.

**Answer.**
- `READ_UNCOMMITTED` — dirty reads possible. Essentially never appropriate.
- `READ_COMMITTED` — no dirty reads; non-repeatable reads and phantoms possible. Default for PostgreSQL, Oracle, SQL Server.
- `REPEATABLE_READ` — same row reads consistently; phantoms possible in theory (MySQL InnoDB prevents them with gap locks). Default for MySQL.
- `SERIALIZABLE` — as if transactions ran one at a time. Implemented either by locking (blocking) or by SSI in PostgreSQL (optimistic, aborts with a serialization failure you must retry).

The anomalies: **dirty read** (see uncommitted data), **non-repeatable read** (same row, different value on re-read), **phantom read** (same query, new rows appear), and **lost update** (two read-modify-writes, one overwrites the other — not prevented by `READ_COMMITTED`, which is why you need `SELECT ... FOR UPDATE` or optimistic versioning).

**Why it matters.** In payments, the lost-update case is the money bug: two concurrent balance updates under `READ_COMMITTED` will happily lose one. The correct answers are a version column with optimistic locking plus retry, a `FOR UPDATE` pessimistic lock, or an atomic `UPDATE balance = balance - ?` with a `WHERE balance >= ?` guard and a row-count check.

**Follow-up: Does higher isolation always mean more locking?**
No — MVCC databases give `READ_COMMITTED` and `REPEATABLE_READ` from snapshots without read locks. PostgreSQL's `SERIALIZABLE` is optimistic, so the cost is aborts rather than blocking. You must design for retry.

---

### Q104. How does Spring Boot auto-configuration work?

**Answer.** `@SpringBootApplication` includes `@EnableAutoConfiguration`, which uses the `AutoConfigurationImportSelector` to read auto-configuration class names from `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (previously `spring.factories`) on the classpath. Each is a `@Configuration` class guarded by conditions: `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`, `@ConditionalOnWebApplication`, and ordering hints (`@AutoConfigureAfter`).

`@ConditionalOnMissingBean` is the mechanism that makes it feel magical but overridable: define your own `DataSource` bean and Boot's backs off.

**Follow-up: How do you debug why a bean isn't what you expect?**
Run with `--debug` or `-Ddebug` to get the auto-configuration report showing positive and negative matches with reasons. Also `/actuator/beans` and `/actuator/conditions`. That report answers 90% of "why is Spring doing this" questions.

**Follow-up: What's the property resolution order?**
Roughly: command-line args > `SPRING_APPLICATION_JSON` > OS environment variables > profile-specific external config > profile-specific packaged config > external `application.properties` > packaged > `@PropertySource` > defaults. Environment variables map with relaxed binding (`SPRING_DATASOURCE_URL` → `spring.datasource.url`), which is what makes 12-factor container config work.

---

### Q105. How does Spring handle circular dependencies, and should you rely on it?

**Answer.** For field/setter injection, Spring uses a three-level cache of early bean references: it exposes a raw, not-yet-fully-initialised singleton so the other bean can hold a reference, then finishes wiring. For **constructor** injection it cannot do this — the object can't exist before its dependencies — so it fails with `BeanCurrentlyInCreationException`. Spring Boot 2.6+ disables circular references by default (`spring.main.allow-circular-references`).

Should you rely on it? No. A cycle means the responsibilities are wrong. Fix it by extracting the shared behaviour into a third bean, inverting one direction with an event or a callback interface, or using `ApplicationEventPublisher` to decouple. `@Lazy` on one side is a workaround, not a fix — and it leaves you with a proxy that fails later.

---

### Q106. How do you structure configuration for multiple environments?

**Answer.** `@ConfigurationProperties` classes over scattered `@Value`, because they're type-safe, validatable with `@Validated` + JSR-380, bindable as immutable records/constructor binding, documented via metadata, and testable. Profiles (`application-prod.yml`) for structural differences only; everything environment-specific (URLs, credentials, limits) comes from the environment or a secret manager, never from a committed file.

Secrets: never in Git, never in the image, never in an env var if you can avoid it (they leak into logs, crash dumps, and `/proc`). Vault/AWS Secrets Manager/Kubernetes secrets mounted as files, with rotation.

**Follow-up: How do you validate config at startup?**
`@Validated` on the properties class with `@NotBlank`, `@Min`, custom validators — the app then refuses to start on bad config rather than failing at 3am on the first request that touches it. Fail fast is a config strategy.

---

### Q107. Explain the Spring Security filter chain.

**Answer.** Security is a servlet `Filter` (`DelegatingFilterProxy` → `FilterChainProxy`) that delegates to an ordered chain of `SecurityFilterChain`s, each matched by a request matcher. Within a chain, filters run in a defined order: exception translation, context persistence (`SecurityContextHolderFilter`), CSRF, authentication filters (form login, Basic, bearer token), then authorisation (`AuthorizationFilter`) last.

Authentication produces an `Authentication` stored in the `SecurityContext` (a `ThreadLocal` by default — which matters for async and for virtual threads/`@Async` propagation). Authorisation happens both at the URL level in the chain and at the method level via `@PreAuthorize`, which is AOP and therefore subject to the same proxy limitations as `@Transactional`.

**Follow-up: When do you need CSRF protection?**
When the browser automatically attaches credentials — cookie-based sessions. A stateless API using an `Authorization: Bearer` header is not CSRF-vulnerable in the same way, because the token isn't sent automatically. Disabling CSRF for a cookie-session app is a real vulnerability, not a convenience.

**Follow-up: JWT pitfalls?**
Accepting the `alg` header from the token (the `alg: none` attack) — pin the algorithm server-side. No revocation: a stolen token is valid until expiry, so keep lifetimes short and maintain a denylist or use opaque tokens with introspection for high-value operations. Putting sensitive data in the payload (it's base64, not encrypted). Not validating `iss`, `aud`, and `exp`. And storing them in `localStorage`, where XSS can read them.

---

### Q108. How do you make a Spring service observable?

**Answer.** Three pillars, plus the fourth thing people forget.
- **Metrics**: Micrometer → Prometheus. RED metrics per endpoint (rate, errors, duration as histograms so you get real percentiles, not averages), plus resource gauges (connection pool usage, queue depth, thread counts) and business metrics (payments authorised/declined by reason code).
- **Tracing**: Micrometer Tracing / OpenTelemetry with W3C `traceparent` propagation across services and into async boundaries and message headers — the last part is where most implementations break.
- **Logging**: structured JSON, with trace and span IDs in the MDC so a log line joins a trace. Never log PANs, CVVs, tokens, or full request bodies in a payments system.
- **The fourth thing**: correlate them. A dashboard where you can go alert → trace → log line in two clicks is worth more than any individual signal.

**Follow-up: Why histograms and not averages?**
Averages hide the tail. A 50 ms average with a 3 s p99 means 1 in 100 users has a bad time, and that's usually the group that matters. Use `percentiles-histogram` so percentiles are aggregatable across instances — client-side percentiles cannot be averaged.

---

### Q109. Spring MVC vs WebFlux vs virtual threads.

**Answer.** MVC is thread-per-request on a servlet container. WebFlux is event-loop based with Reactor, scaling to high concurrency on few threads but requiring the whole call chain to be non-blocking. Spring Boot 3.2+ on Java 21 offers a third option: MVC with `spring.threads.virtual.enabled=true`, running each request on a virtual thread.

My default for a typical service: MVC on virtual threads. You get WebFlux-level concurrency for I/O-bound work with none of the cognitive cost, plus normal debugging and normal stack traces. WebFlux earns its place when you need streaming with backpressure (SSE, websockets, large data pipelines) or you're already invested in Reactor.

**Follow-up: What must you check before enabling virtual threads?**
Blocking inside `synchronized` (pinning — Q62), JDBC driver and connection pool behaviour, `ThreadLocal`-heavy libraries, and anything that pools by thread identity. Also: your database connection pool is still your real concurrency limit, so add a semaphore or keep the pool as the bulkhead — otherwise you just move the queue.

---

### Q110. How do you test a Spring application without a 10-minute build?

**Answer.** Layered, with most tests not using Spring at all:
- **Plain unit tests** for domain logic — no container, milliseconds. This should be the bulk.
- **Slice tests** — `@WebMvcTest` (controller + JSON + validation, mocked service), `@DataJpaTest` (repositories against a real DB via Testcontainers), `@JsonTest`. Fast because they load a fraction of the context.
- **Full `@SpringBootTest`** — a handful, for wiring and critical happy paths.

Key performance point: **context caching**. Spring caches application contexts by configuration key, so every distinct combination of `@MockBean`, properties and profiles creates a *new* context. A build with 40 unique configurations pays 40 startups. Standardise on a small number of test configurations and use `@MockBean` sparingly (each one dirties the context key).

**Follow-up: Testcontainers vs H2?**
Testcontainers, essentially always. H2 in "PostgreSQL mode" doesn't have PostgreSQL's SQL, types, locking behaviour, or constraint semantics, so it gives you false confidence — you find the difference in production. Use a singleton container pattern or reusable containers to keep it fast.

---

## 9. Persistence & JPA

### Q111. Explain the persistence context and entity lifecycle.

**Answer.** The persistence context is a first-level cache and unit of work scoped to the `EntityManager` (usually the transaction). Entity states: **transient** (new, no ID, not managed), **managed** (attached — changes are tracked and flushed automatically), **detached** (was managed, context closed), **removed** (scheduled for deletion).

Managed entities get **dirty checking**: at flush, Hibernate compares each entity against a snapshot taken at load and issues UPDATEs for what changed. You never call `save()` on a managed entity — mutating it inside a transaction is enough, which surprises people coming from other ORMs.

**Follow-up: `merge` vs `persist` vs `save`?**
`persist` makes a transient entity managed (and throws if it has an ID that already exists). `merge` copies the state of a detached entity onto a managed instance and **returns that instance** — the passed object stays detached, which is the number one `merge` bug: `em.merge(order); order.setX(...)` does nothing. Spring Data's `save()` picks between them based on whether the entity is new (by ID or `Persistable.isNew()`), which is convenient and occasionally does a surprise SELECT before every insert.

---

### Q112. What causes `LazyInitializationException`, and what's the right fix?

**Answer.** Accessing a lazy association after the persistence context is closed — typically in a controller or a serializer, after the transactional service method returned. The proxy has no session to load from.

The wrong fixes: making everything `EAGER` (now every query drags the object graph), and enabling `spring.jpa.open-in-view` (on by default in Boot, and I turn it off) — it holds the database connection for the entire request including view rendering, hides N+1 queries behind lazy loads scattered through the presentation layer, and makes connection pool exhaustion a mystery.

The right fixes: fetch exactly what you need inside the transaction, using a `JOIN FETCH`, an `@EntityGraph`, or — best — a projection/DTO query that returns precisely the fields the caller needs. Map to DTOs at the transaction boundary so entities never escape.

---

### Q113. Explain the N+1 problem and all the ways to fix it.

**Answer.** You load N orders with one query, then touch `order.getCustomer()` on each, producing N more queries. It's invisible in development with 5 rows and fatal in production with 5,000.

Fixes:
- `JOIN FETCH` in JPQL — one query, but be careful: fetching two collections in one query gives a cartesian product, and combining `JOIN FETCH` with pagination makes Hibernate paginate **in memory** (it warns `firstResult/maxResults specified with collection fetch; applying in memory`) — a guaranteed OOM at scale.
- `@EntityGraph` — declarative fetch plan on a Spring Data repository method, cleaner than JPQL for this.
- `@BatchSize(size = 50)` or `hibernate.default_batch_fetch_size` — turns N queries into N/50 `IN (...)` queries. Excellent default, low effort, works with pagination.
- `Subselect` fetch mode — one extra query re-running the original as a subquery.
- **DTO projection** — the best answer for read paths: a constructor expression or interface projection selecting exactly the columns needed, no entities, no lazy loading, no dirty checking overhead.

**Follow-up: How do you *detect* N+1 before production?**
Turn on `hibernate.generate_statistics` and assert query counts in integration tests, or use a tool that fails the test when a single request exceeds a query threshold. Log SQL in development with `spring.jpa.show-sql` / `logging.level.org.hibernate.SQL=DEBUG`. Detection has to be automated — code review won't catch it.

---

### Q114. Optimistic vs pessimistic locking.

**Answer.** **Optimistic** uses a `@Version` column: the UPDATE carries `WHERE version = ?` and increments it; zero rows updated means someone else won, and you get `OptimisticLockException`. No locks held, great under low contention, and the caller must be prepared to retry.

**Pessimistic** takes a database lock at read time: `PESSIMISTIC_READ` (shared), `PESSIMISTIC_WRITE` (exclusive, `SELECT ... FOR UPDATE`), `PESSIMISTIC_FORCE_INCREMENT`. Correct under high contention on the same row, but it holds a lock for the duration of the transaction — so it serialises, risks deadlocks, and requires a lock timeout so a stuck transaction doesn't stall everything.

**Which for payments?** For a balance update, I'd prefer an atomic conditional UPDATE at the SQL level (`UPDATE accounts SET balance = balance - :amt WHERE id = :id AND balance >= :amt`) and check the affected row count — no read-modify-write window at all. Where that's not expressible, optimistic with bounded retry and jittered backoff, and pessimistic only for genuinely contended hot rows.

**Follow-up: What's the retry policy for an optimistic failure?**
Bounded retries (3–5), exponential backoff with jitter, and the whole transaction re-executed from the start — retrying just the commit is meaningless because your in-memory state is stale. And the operation must be idempotent, or the retry becomes a double payment.

---

### Q115. How do first-level and second-level caches differ, and when do you use L2?

**Answer.** L1 is the persistence context — always on, transaction-scoped, guarantees identity (`em.find` twice returns the same instance). L2 is a shared, cross-session, cross-transaction cache (Ehcache, Infinispan, Hazelcast) configured per entity, plus an optional query cache.

L2 is worth it for reference data: currency tables, country codes, fee schedules, product catalogues — read-heavy, rarely changed, small. It's dangerous for mutable transactional data, because any write path that bypasses Hibernate (a batch job, another service, a DBA's SQL) leaves the cache stale with no way to know.

The query cache is usually a trap: it caches IDs, then re-fetches entities, and it's invalidated by *any* write to the involved tables, so on a write-active table its hit rate approaches zero while it still costs you.

**Follow-up: How do you decide between L2 and an application-level cache?**
An application cache (Caffeine, Redis) at the service layer caches the *result of a use case*, which is usually what you actually want, and it's explicit about invalidation. L2 caches entities transparently, which is convenient but couples caching to your ORM and makes staleness harder to reason about. I lean towards explicit application caching for anything I'd page someone about.

---

### Q116. How do you write `equals`/`hashCode` for JPA entities?

**Answer.** The requirement is that identity is stable across all four entity states, including before the ID is assigned. Options:

1. **Business key** — a natural unique immutable key (order reference, IBAN). Best when one exists.
2. **Client-assigned UUID** — generate the ID in the application before persist, so it never changes. My preferred default for new systems; it also decouples you from database sequences and makes distributed inserts easier.
3. **Database ID with a constant `hashCode`** — `hashCode()` returns a constant (e.g. `getClass().hashCode()`) and `equals` compares IDs with a null check. Correct, but every entity lands in the same hash bucket, so collections degrade to linear scan. Acceptable for small collections.

Never: default `Object` identity (breaks after detach/merge), and never a mutable field.

**Follow-up: Why do records not work as entities?**
JPA requires a no-arg constructor and mutable fields for proxying and dirty checking. Records are final and immutable. Use records for DTOs/projections and classes for entities — which is a healthy separation anyway.

---

### Q117. How do you size a HikariCP connection pool?

**Answer.** Small. The counterintuitive result — from HikariCP's own docs and PostgreSQL benchmarking — is that a pool of ~10 often outperforms a pool of 100, because the database has a limited number of cores and disks; more concurrent connections mean more context switching and lock contention, not more throughput. A common starting formula is `connections = ((core_count × 2) + effective_spindle_count)`, then measure.

The other constraints: total connections across *all* application instances must stay under the database's `max_connections` (and leave headroom for admin and migration tools). And `connectionTimeout` should be short enough that a saturated pool produces a fast failure you can shed, not a 30-second hang that fills your request threads.

**Why it matters.** Pool exhaustion is one of the top production incidents in a service: a slow query holds connections, requests queue on `getConnection()`, the thread pool fills, health checks fail, and the orchestrator restarts you into the same wall. Instrument `hikaricp_connections_pending` and alert on it.

**Follow-up: What causes connection leaks?**
Not closing (rare with Spring's template management), `REQUIRES_NEW` nesting holding two connections per request, a transaction spanning an HTTP call to another service (never do this), and `open-in-view` holding a connection through view rendering. `leakDetectionThreshold` logs a stack trace for connections held too long — enable it in staging.

---

### Q118. How do you do zero-downtime schema migrations?

**Answer.** Expand/contract, in separate deploys:
1. **Expand** — add the new nullable column / new table. Old code ignores it, new code can use it. Never rename or drop in the same step.
2. **Backfill** — populate in batches, throttled, idempotent and resumable. Not in a single transaction over 50 million rows.
3. **Migrate reads** — deploy code that writes both and reads new (or reads new with fallback).
4. **Contract** — after the old code is fully out of production and you're confident, drop the old column.

Tooling: Flyway or Liquibase with versioned, immutable, checked-in migrations run at startup or by a separate job (I prefer a separate job/init container so ten replicas don't race, and so a migration failure isn't a rolling-restart failure). Every migration must be backward compatible with the *previous* application version, because during a rolling deploy both versions are live simultaneously.

**Follow-up: What about a long-running `ALTER TABLE`?**
On PostgreSQL, adding a nullable column is instant, adding a `NOT NULL` with a default is instant in modern versions, but adding an index locks writes unless you use `CREATE INDEX CONCURRENTLY`. On MySQL, check the online DDL support for your version, or use gh-ost/pt-online-schema-change. Always test the migration against a production-sized copy, timed.

---

### Q119. When would you not use JPA?

**Answer.** JPA is optimised for entity-graph CRUD with a rich domain model. It's a poor fit for: read-heavy reporting and analytics (use a projection query, jOOQ, or plain SQL); bulk operations (JPA's `update`/`delete` bypass the persistence context and leave it stale — batch SQL is clearer); complex, tuned SQL with window functions or CTEs; and high-throughput write paths where dirty checking and flush overhead matter.

My usual architecture is CQRS-lite: JPA for the transactional write model where invariants live, and jOOQ or Spring's `JdbcClient` for reads and reports. That gets you the safety where you need it and full SQL where you need that.

**Follow-up: What's the argument for jOOQ?**
Type-safe SQL generated from the actual schema, so a column rename breaks the build rather than production. You keep SQL as SQL — no fighting an abstraction to express a `LATERAL` join — and there's no hidden lazy loading or flush ordering. The cost is a code-generation step and no free change tracking.

---

### Q120. How does Hibernate decide when to flush, and why does that matter?

**Answer.** Default `FlushMode.AUTO`: before a query whose result could be affected by pending changes, and always at commit. `COMMIT` mode flushes only at commit. `MANUAL` never flushes automatically.

It matters because flush ordering isn't your statement ordering. Hibernate orders operations by type (inserts, then updates, then collection operations, then deletes), which is why "delete then insert the same unique key" fails with a constraint violation unless you flush explicitly between them. It's also why an unexpected SELECT can trigger a cascade of UPDATEs at a surprising moment, and why exceptions surface at commit rather than at the line that caused them.

**Follow-up: How do you batch inserts efficiently?**
Set `hibernate.jdbc.batch_size`, enable `order_inserts` and `order_updates`, use a sequence-based or table-based ID generator (`IDENTITY` disables batching entirely, because Hibernate must execute each insert to get the ID), and periodically `flush()` + `clear()` to keep the persistence context from growing unbounded. For a truly large load, drop to `JdbcTemplate` batch updates or the database's bulk-load tool.

---

## 10. Distributed Systems, Microservices & Payments

### Q121. How do you make a payment API idempotent?

**Answer.** The client sends an `Idempotency-Key` header (a UUID it generates per logical operation, reused across retries). Server side:

1. Compute a fingerprint of the request body.
2. Insert `(key, fingerprint, status=IN_PROGRESS)` into an idempotency table with a **unique constraint on the key**. The unique index — not an application-level check — is what makes this race-free.
3. If the insert succeeds, you own the request: execute it, then store the response and mark `COMPLETED`, in the same transaction as the business change wherever possible.
4. If the insert conflicts, look up the existing record. Same fingerprint + `COMPLETED` → return the stored response with the original status code. Same fingerprint + `IN_PROGRESS` → return 409 and let the client retry. Different fingerprint → 422; the client reused a key for a different request, which is a bug you must surface loudly.
5. Expire records after a window (24h–7d) that exceeds any client's retry horizon.

**Why it matters.** Every network call has three outcomes: success, failure, and *unknown*. Idempotency is what turns "unknown" into something safely retryable, and without it a timeout on an authorisation becomes a double charge. This is table-stakes in payments and Stripe's implementation is the reference design.

**Follow-up: Isn't a `GET`-before-`POST` check enough?**
No — two concurrent retries both check, both see nothing, both proceed. The atomicity has to come from the database constraint.

**Follow-up: What if the operation spans multiple services?**
Propagate the idempotency key downstream (or derive a deterministic key per downstream call from it), so each hop is independently idempotent. Combine with a saga (Q123) for the multi-step case.

---

### Q122. At-least-once, at-most-once, exactly-once — what's actually achievable?

**Answer.** Exactly-once *delivery* is impossible in a distributed system with failures (it reduces to the Two Generals problem). What's achievable is **effectively-once processing**: at-least-once delivery plus idempotent consumers, or transactional processing where the offset commit and the side effect are atomic.

So the practical design: producers retry (at-least-once), consumers deduplicate by a business key or message ID with a dedup store, and any side effect that isn't naturally idempotent is made so. Kafka's "exactly-once semantics" is real but scoped: it gives you atomic read-process-write *within Kafka* via transactions and idempotent producers. It doesn't extend to your database or a third-party HTTP call.

**Follow-up: What's the dual-write problem?**
Writing to the database and publishing an event are two separate systems; a crash between them leaves them inconsistent — either a committed order with no event, or an event for an order that rolled back. You cannot fix this with try/catch, ordering, or a 2PC you don't control.

---

### Q123. Explain the transactional outbox and the saga pattern.

**Answer.** **Outbox** solves the dual-write problem: in the *same local transaction* as the business change, insert a row into an `outbox` table. A separate relay — either polling the table or tailing the database log with CDC (Debezium) — publishes those rows to the broker and marks them sent. One atomic commit, so the event can't be lost or orphaned. Delivery is at-least-once, so consumers must dedupe.

**Saga** handles a business transaction spanning services without distributed locks. Each step is a local transaction that publishes an event triggering the next; if a step fails, you run **compensating** transactions in reverse. Choreography (services react to each other's events) is simple but the flow is implicit and hard to follow; orchestration (a coordinator holds the state machine) is explicit, observable, and my default beyond three steps.

**Why it matters.** In payments the key insight is that compensation isn't rollback: you don't un-capture a payment, you issue a refund. That's a *new* business fact, visible to the customer, with its own failure modes. Designing compensations is a domain conversation, not a technical one.

**Follow-up: What about the money that's temporarily in a bad state?**
That's why you model reservations/holds explicitly and reconcile. A saga always has intermediate states where the system is not consistent — you make them first-class in the model, give them timeouts, and report on them.

---

### Q124. Why not just use two-phase commit / XA?

**Answer.** 2PC gives atomic commit across resources, but the coordinator is a single point of failure at exactly the wrong moment: if it dies after prepare, participants hold locks indefinitely — the blocking problem. It requires all resources to support XA (most HTTP APIs and Kafka don't), it holds locks across network round trips (killing throughput), and it couples availability of all participants.

In practice the trade is availability vs consistency, and most payment systems choose availability plus reconciliation. Where atomicity is non-negotiable — within a single ledger — I'd keep it inside one database transaction rather than spread it across services. That's an argument for putting the ledger in one service, not for XA.

---

### Q125. Design a retry strategy that doesn't take down your own system.

**Answer.** Rules I'd apply:
- **Only retry idempotent or idempotency-keyed operations.** Retrying a non-idempotent charge is worse than failing.
- **Only retry retryable errors** — timeouts, 429, 502/503/504, connection resets. Never 400/401/403/422; those will fail identically forever.
- **Exponential backoff with full jitter** — `sleep = random(0, min(cap, base × 2^attempt))`. Jitter is essential: without it, all clients that failed together retry together and you get a synchronised thundering herd on a recovering service.
- **Bounded attempts and a total time budget.** The budget is more important than the count — a retry that lands after the caller has timed out is pure waste and load.
- **Respect `Retry-After`.**
- **Cap the aggregate retry rate** (a retry budget: e.g. retries may not exceed 10% of requests), which prevents retry amplification where each of three layers retries three times and the origin sees 27×.
- **Combine with a circuit breaker** so a sustained failure stops generating retries at all.

**Why it matters.** Retry storms are a top cause of outages *extending* rather than recovering. The senior instinct is that retries are load, and load is what broke the thing you're retrying.

**Follow-up: How do timeouts relate?**
Every call needs one, and they must form a decreasing budget down the call chain — if your gateway times out at 2s, a downstream 5s timeout is meaningless work. Also distinguish connect, read, and total timeouts. A missing socket timeout on an HTTP client is one of the most common "the whole service hung" root causes.

---

### Q126. Explain circuit breakers and bulkheads.

**Answer.** A **circuit breaker** tracks the failure rate of calls to a dependency. Closed = normal. When failures exceed a threshold over a sliding window, it trips **Open** and fails immediately without calling — protecting both you (threads not consumed waiting) and the dependency (no load while it recovers). After a wait, it goes **Half-Open** and permits a few probe calls; success closes it, failure re-opens it.

A **bulkhead** limits concurrent calls per dependency — a semaphore or a dedicated thread pool — so one slow dependency can consume at most N of your threads instead of all of them. Named after ship compartments: one flooded section doesn't sink the vessel.

Together with timeouts, retries, rate limiting and fallbacks, that's the resilience toolkit (Resilience4j in Java; Hystrix is retired).

**Follow-up: What's the danger of a circuit breaker?**
Bad configuration turns a partial degradation into a total outage: too-sensitive thresholds trip on normal error rates, or a shared breaker across unrelated endpoints trips because one endpoint is failing. Also, the fallback must be genuinely useful — returning a cached/degraded response is resilience; returning an error faster is just failing with extra steps. And in payments, never fall back to "assume approved".

---

### Q127. Kafka: how do you guarantee ordering and handle rebalancing?

**Answer.** Ordering is guaranteed only **within a partition**. So you pick a partition key that matches your ordering requirement — for payments, the account ID or the payment ID, so all events for one entity are ordered, while different entities process in parallel. Global ordering means one partition, which means no parallelism; almost always the wrong requirement, and worth pushing back on.

Consumer groups assign each partition to exactly one consumer in the group. **Rebalancing** happens when a consumer joins, leaves, or is deemed dead — and during a stop-the-world rebalance, the whole group stops consuming. Causes of surprise rebalances: `max.poll.interval.ms` exceeded because processing a batch took too long (the fix is smaller `max.poll.records` or moving work off the poll thread), and `session.timeout.ms` with a stalled heartbeat. Cooperative incremental rebalancing (the default in modern Kafka) reduces the blast radius by only moving the affected partitions.

**Follow-up: How do you avoid reprocessing and data loss on commit?**
`enable.auto.commit=false`, and commit offsets **after** the side effect succeeds — that gives at-least-once (a crash between effect and commit means reprocessing, hence idempotent consumers). Committing before processing gives at-most-once and loses messages. For effectively-once within Kafka, use transactions with `read_committed`.

**Follow-up: What do you do with a poison message?**
Bounded retries with backoff, then route to a dead-letter topic with the original headers, the error, and the trace ID; alert on DLQ depth. Never block the partition forever on one bad message, and never silently drop it — in payments, a lost message is a lost financial event.

---

### Q128. What's wrong with distributed locking via Redis?

**Answer.** The general problem is that a lock with a TTL is not a lock — it's a lease. If your process is paused (GC, hypervisor steal, network partition) past the TTL, the lock expires, another process acquires it, and now two processes believe they hold it. No amount of Redlock cleverness fixes this, because the client cannot detect its own pause.

The correct fix, per Martin Kleppmann's critique, is **fencing tokens**: the lock service issues a monotonically increasing token with each grant, and the *protected resource* rejects any write carrying a token lower than one it has already seen. That makes the stale holder's write harmless. But it requires the resource to participate — which usually means you should have used the database's own concurrency control in the first place.

So my ranking: (1) make the operation idempotent so double execution is harmless; (2) use a database constraint or conditional update — the database is already a consensus system; (3) use a real consensus store (etcd, ZooKeeper) with fencing if you need leader election; (4) Redis locks only for best-effort optimisation, like preventing duplicate work in a cron, where a rare double run is acceptable.

**Why it matters.** In fintech, "a rare double run" might mean a duplicate payout. Knowing where a lock is an optimisation versus a correctness mechanism is the whole answer.

---

### Q129. How do you represent money in Java?

**Answer.** Never `double` or `float` — binary floating point cannot represent 0.1, so `0.1 + 0.2 != 0.3` and errors compound across a ledger. Two acceptable representations:

1. **Integer minor units** — store `long` cents/sen, with the currency alongside. Fast, exact, no rounding surprises, natural fit for most payment APIs and databases. My default.
2. **`BigDecimal`** — exact decimal arithmetic with explicit scale and `RoundingMode`. Necessary when you need more than 2 decimals (FX rates, interest, per-unit pricing).

Rules with `BigDecimal`: always use the `String` constructor (`new BigDecimal("0.1")`, never `new BigDecimal(0.1)` which captures the binary error); always specify a `RoundingMode` on `divide` or you get `ArithmeticException` for non-terminating results; and use `compareTo() == 0` for equality, because `equals` also compares scale, so `2.0` does not equal `2.00`.

Always pair the amount with a currency in one value object, and never add two `Money` values of different currencies:

```java
public record Money(long minorUnits, Currency currency) {
    public Money plus(Money o) {
        if (!currency.equals(o.currency)) throw new CurrencyMismatchException(currency, o.currency);
        return new Money(Math.addExact(minorUnits, o.minorUnits), currency);
    }
}
```

**Follow-up: Where does rounding go?**
Define it once, explicitly, per business rule — `HALF_EVEN` (banker's rounding) is standard for financial totals because it doesn't bias upward over many operations, but tax and interest calculations often have a legally mandated mode. And decide the rounding *point*: rounding each line item then summing gives a different total from summing then rounding, and the auditors will care which you chose.

**Follow-up: What about currencies that aren't 2-decimal?**
JPY and KRW have 0 decimals; BHD, KWD and JOD have 3. Never hardcode 100 — use `Currency.getDefaultFractionDigits()`, and note that some crypto and internal accounting currencies exceed anything `java.util.Currency` knows about.

---

### Q130. How would you design a ledger?

**Answer.** Double-entry, append-only. Every financial event produces at least two entries that sum to zero across accounts — a debit and a credit — so the ledger is self-checking: the sum of all entries in a currency must always be zero, and that's an invariant you can assert continuously.

Properties I'd insist on:
- **Immutable entries.** No UPDATE, no DELETE. A correction is a reversing entry plus a new one, preserving history for audit.
- **A transaction/journal grouping** so the two legs commit atomically in one database transaction.
- **Balances derived** from entries, with a materialised balance row updated in the same transaction (with a version or conditional update) for read performance, and a periodic recomputation job that verifies it matches the sum of entries.
- **An idempotency key per journal entry** so the same business event never posts twice.
- **Monotonic sequence and timestamps** — both business time (when it happened) and system time (when we recorded it); they differ, and reconciliation needs both.

**Follow-up: How do you handle reconciliation with an external processor?**
Ingest their settlement file, match on your reference plus theirs, and classify every difference: missing on our side, missing on theirs, amount mismatch, status mismatch, timing difference. Automate the match, queue exceptions for human review, and track the unmatched count and age as a monitored metric — a growing unreconciled backlog is the earliest signal that something is broken.

**Follow-up: What about hot accounts?**
A single settlement account receiving every transaction becomes a write hot spot and a lock contention point. Standard mitigations: shard the account into N sub-balances and route by hash (sum them to read), or batch/aggregate postings, or use an append-only entries table with periodic rollup rather than a live balance row.

---

### Q131. How do you version a public API without breaking clients?

**Answer.** Prefer additive, backward-compatible evolution over versioning: adding optional fields and new endpoints breaks nobody, provided clients ignore unknown fields (which you should mandate in your API guidelines — Jackson's `FAIL_ON_UNKNOWN_PROPERTIES` false on the client). Breaking changes are removing or renaming a field, tightening validation, changing a type, changing semantics of an existing field, and adding a required field.

When a breaking change is unavoidable: version in the URL path (`/v2/payments`) for coarse, visible versioning, or by media type for finer-grained. Run both versions concurrently, instrument usage per version and per client, publish a deprecation timeline with `Deprecation` and `Sunset` headers, and only remove when usage is zero. For internal service-to-service, schema registries with compatibility rules (Avro/Protobuf `BACKWARD` compatibility) enforce this at build time, which is much better than hoping.

**Follow-up: How does this interact with rolling deploys?**
During a deploy, both versions of your *own* service run simultaneously against one database. So every change must be compatible with the previous version in both directions for one release cycle — same expand/contract discipline as schema migration (Q118).

---

### Q132. What security concerns are specific to a payments backend?

**Answer.**
- **Don't hold what you don't need.** Tokenise card data so PANs never touch your systems; that shrinks PCI-DSS scope more than any control you can add. If you must handle them, encrypt with keys in an HSM/KMS, and never log them — enforce it with log scrubbing and tests, because it *will* be logged accidentally.
- **Secrets management** — no credentials in code, images, or environment where avoidable; rotate; use short-lived credentials.
- **Authorisation on every request, at the object level.** The most common real-world API vulnerability is IDOR/BOLA — an authenticated user requesting another user's payment ID. Authentication is not authorisation.
- **Input validation and output encoding** — parameterised queries always (never string-concatenated SQL, even for an "internal" admin tool).
- **Deserialization** — never deserialize untrusted Java serialized data; that's remote code execution via gadget chains. Use JSON with a schema, disable polymorphic type handling in Jackson (`enableDefaultTyping` is the CVE factory), and validate.
- **Supply chain** — dependency scanning in CI, SBOM, pinned versions. Log4Shell was a dependency you didn't know you had, in a logging call you thought was inert.
- **Audit trail** — immutable, complete, with actor, action, before/after, and correlation ID. In financial systems this is a regulatory requirement, not a nice-to-have.
- **Rate limiting and anomaly detection** on authentication and payment endpoints — card testing attacks look like traffic, not like exploits.

**Follow-up: What is BOLA and how do you prevent it structurally?**
Broken Object Level Authorization. Structurally: never accept a raw internal ID and trust it; scope every query by the authenticated principal (`WHERE id = ? AND customer_id = ?`) at the repository level so a developer can't forget, and add integration tests that assert cross-tenant access returns 404.

---

### Q133. Design a distributed rate limiter.

**Answer.** Choose the algorithm by the property you need:
- **Fixed window** — a counter per key per window. Simple, but allows a 2× burst at the window boundary.
- **Sliding window log** — exact, stores every timestamp. Accurate, memory-hungry.
- **Sliding window counter** — weighted blend of current and previous window. Good accuracy/cost trade-off; what most CDNs use.
- **Token bucket** — refill at rate R, capacity B. Allows controlled bursts, which is usually what you actually want for an API. My default.
- **Leaky bucket** — smooths output to a constant rate; use when the downstream needs a steady rate.

Distributed implementation: Redis with an atomic Lua script (read, refill, decide, write in one round trip — atomicity is the whole problem), keyed by client/API key/IP plus endpoint. Then the practical concerns: what happens if Redis is down (fail open for availability, fail closed for protection — a deliberate decision per endpoint); local per-instance limiting as a cheap first tier so you don't call Redis for obvious rejects; and returning `429` with `Retry-After`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` so well-behaved clients can self-regulate.

**Follow-up: How do you rate limit fairly across tenants?**
Per-tenant buckets rather than a global one, so a noisy tenant can't consume everyone's quota — that's a bulkhead applied to quota. Add a global limit on top to protect the system itself.

---

## 11. Testing, Debugging & Engineering Practice

### Q134. What does the test pyramid look like on a real service you've built?

**Answer.** Broad base of fast unit tests on domain logic with no framework, no I/O, no mocks of things I own. A middle layer of integration tests against real infrastructure via Testcontainers — the database, the broker — because that's where the interesting bugs are (SQL, transactions, serialisation, migrations). A thin layer of end-to-end tests covering critical user journeys only, because they're slow, flaky, and expensive to maintain.

Plus two things people leave off the pyramid: **contract tests** between services (Pact or schema-registry compatibility checks), which catch integration breakage without a full environment, and **production verification** — synthetic transactions, canary deploys, and good alerting, because you cannot test your way to certainty about production.

**Follow-up: What's the ice cream cone anti-pattern?**
The inverted pyramid: a handful of unit tests, and mostly slow UI/E2E tests. Symptoms are a 90-minute CI pipeline, a "flaky test" retry culture, and nobody trusting a red build — which is worse than having no tests, because a distrusted signal is a disabled signal.

---

### Q135. When do mocks make tests worse?

**Answer.** When you mock things you own, you end up asserting your own implementation back at yourself: the test knows the exact call sequence, so any refactoring breaks it even though behaviour is unchanged. That's the opposite of what tests are for. Over-mocked tests also pass while the real integration is broken, because the mock encodes your *assumption* about the collaborator, and the assumption is what's wrong.

My rules: mock at architectural boundaries you don't control (third-party HTTP APIs, payment processors, time, randomness). Use real objects for your own domain collaborators. Use a real database via Testcontainers rather than mocking a repository. Prefer fakes (a simple in-memory implementation of the interface) over mocks — they're reusable, they enforce the contract, and they don't couple to call order. And prefer state-based assertions over `verify()` interaction assertions unless the interaction *is* the requirement (e.g. "we must call the processor exactly once").

**Follow-up: How do you test a third-party integration you've mocked away?**
Contract tests plus a recorded-response layer (WireMock with real captured payloads), plus a periodic test against their sandbox that runs outside the main pipeline so it can be slow and occasionally down.

---

### Q136. How do you deal with flaky tests?

**Answer.** Treat a flaky test as a production bug, not a nuisance. Quarantine it immediately so it stops eroding trust in the build, but file it with an owner and a deadline — quarantine without a deadline is deletion with extra steps.

Then find the cause, which is almost always one of: shared mutable state between tests (static fields, a shared database not reset, test ordering dependence); real time (`Thread.sleep`, timeouts tuned to a fast laptop); real concurrency (racing assertions against async work); non-deterministic collections (asserting on `HashMap` iteration order); external dependencies; or resource leaks that only bite when tests run in a particular order.

Fixes: inject a `Clock`; use Awaitility with an explicit polling condition instead of `sleep`; make each test create its own data with unique keys rather than relying on a fixture; and run the suite in random order in CI to surface ordering dependence deliberately.

**Follow-up: Is retrying flaky tests in CI acceptable?**
As a temporary measure with visibility (track and report retry counts), never as policy. Automatic retries hide real race conditions in your *product*, not just your tests — the same race is happening in production, you just aren't looking.

---

### Q137. What is mutation testing and would you use it?

**Answer.** A tool (PIT for Java) mutates your bytecode — flips a conditional, removes a method call, changes a return value — and re-runs the tests. If the tests still pass, the mutant "survived", meaning that line is covered but not actually *verified*. It measures assertion quality, whereas line coverage only measures execution.

I'd use it selectively: on core domain logic — pricing, fee calculation, limit checks, the ledger — where correctness has monetary consequences, not across a whole codebase (it's slow and produces noise on trivial code). It's also a good one-off audit to find out whether an 85%-coverage codebase actually tests anything.

**Follow-up: What's your view on coverage targets?**
Coverage is a useful *floor* and a terrible *target*. A mandated 80% produces tests written to hit lines, often with no meaningful assertions. I'd rather look at whether critical paths have behaviour-level tests and whether the last five production incidents each got a regression test.

---

### Q138. A production incident: latency has tripled since this morning's deploy. Walk me through it.

**Answer.** Mitigate first, diagnose second. If the deploy correlates, roll back — you can investigate a rolled-back binary calmly. Every minute spent debugging while customers are affected is a choice.

Then, in parallel with mitigation, narrow it down:
1. **Is it us or downstream?** Compare our internal service time against total request time; check dependency latency panels. A trace of one slow request usually answers this in seconds.
2. **Is it GC?** GC log and heap-after-collection trend. A deploy that added a cache or increased object retention shows up here.
3. **Is it the database?** Slow query log, `pg_stat_statements`, connection pool wait time. A new query without an index is the single most common cause of "the deploy made it slow".
4. **Is it saturation?** Thread pool queue depth, connection pool pending count, CPU. A latency increase with flat throughput and rising queue depth is a capacity/blocking problem, not a code problem.
5. **Is it a specific endpoint or all of them?** Per-endpoint percentiles narrow the diff.
6. **What actually changed?** Not just code — config, feature flags, a dependency's deploy, data volume crossing a threshold, a partner's behaviour.

Afterwards: a blameless postmortem with a timeline, contributing factors, and *action items with owners*. The valuable output isn't the root cause, it's the improved detection — the alert that should have fired 20 minutes earlier.

**Follow-up: What if rolling back isn't possible (a schema migration ran)?**
That's why migrations are expand-only and backward compatible (Q118) — the ability to roll back is a design property you build in beforehand, not an option you have in the moment. If it's genuinely one-way, you fix forward, which is why one-way migrations get much more review.

---

### Q139. How do you approach a code review as a senior engineer?

**Answer.** I prioritise: correctness and edge cases first; then security and data handling; then design and whether this makes the codebase easier or harder to change; then tests; and style last (and ideally not at all — a formatter and a linter should own style, so review time goes to things humans are good at).

How I write comments matters as much as what I catch. I distinguish blocking concerns from suggestions explicitly ("nit:" / "non-blocking:"), ask questions rather than issue instructions when I might be missing context, and explain the *why* so the review teaches rather than just gates. If a review has more than about ten comments, I stop typing and have a conversation — that's a design disagreement, not a review.

I also review my own reviews: if I'm the bottleneck for the team, that's my problem to fix, and a same-day review of a small PR is worth more than a perfect review three days later.

**Follow-up: How do you handle disagreement with a strong opinion from a colleague?**
Separate reversible from irreversible decisions. For a reversible one, disagree, state why once, and commit — then revisit with data. For an irreversible one (a data model, a public API, a choice of persistence), it's worth escalating to a written design doc and a wider decision, because the cost of being wrong is much higher than the cost of the argument.

---

### Q140. How do you make a technical decision the team will still respect in two years?

**Answer.** Write it down as an ADR: the context and constraints, the options considered, the decision, and — the part people skip — the consequences we're accepting. Two years later, the value isn't the decision, it's the record of *what we knew at the time*, which stops a future engineer from assuming the previous team was foolish and re-litigating from scratch.

I also try to distinguish one-way from two-way doors, spend decision effort proportionally, and be explicit about what would make us change our minds — "we'll revisit if throughput exceeds X" turns a decision into a hypothesis with a test.

---

### Q141. How do you mentor and grow the engineers around you?

**Answer.** Concretely: pair on hard problems rather than taking them over; in review, explain reasoning rather than just prescribing; hand over work that is slightly beyond someone's current level with a safety net rather than delegating only what's safe; and make my own thinking visible — including when I'm wrong or uncertain, because juniors mostly see seniors' polished conclusions and conclude that seniors don't struggle.

The measure I use: is the team's throughput and quality less dependent on me over time? If I'm the only person who can debug the payment reconciliation job, I've failed at the senior part of the job regardless of how well I debug it.

---

### Q142. What questions should *you* ask the interviewer?

**Answer.** Ask things whose answers would actually change your decision:

- What does the deploy pipeline look like, and how long from merge to production?
- How did the last significant incident go, and what changed afterwards?
- What's the balance of new development versus maintenance on this team right now?
- Where is the codebase's technical debt, and is there budget to address it?
- How are technical decisions made — who decides, and how are they recorded?
- What does the on-call rotation look like, and how often does it wake someone?
- What would you want this person to have accomplished in six months?
- What's the hardest part of working here that isn't on the job description?

**Why it matters.** Interviewers read these as signals about seniority. Asking about incident response and decision-making says you've operated systems and worked in teams; asking only about technology stack says you haven't yet.

---

## 12. Modern Java (22 → 25)

### Q143. Java 21 → 25 is an LTS-to-LTS move. What actually changed, and how would you justify it?

**Answer.** Four groups, and only one of them is a language story.

- **21's rough edges got sanded.** `synchronized` no longer pins virtual threads (JEP 491, JDK 24), which removes the single biggest caveat on adopting them (Q144). `ScopedValue` finalised (JEP 506, JDK 25), so context propagation for virtual threads is no longer a preview bet (Q91).
- **Three runtime features that change operations.** The AOT cache (JEP 483/514/515), compact object headers (JEP 519), and Generational Shenandoah as a product feature (JEP 521). These are flags, not code changes, and they're where the measurable wins are.
- **Language finals that are mostly ergonomics.** Module import declarations, compact source files and instance `main`, flexible constructor bodies (Q154). Stream gatherers (Q147) and the Class-File API (Q148) are the two that genuinely add capability.
- **Removals you must check for.** The Security Manager is permanently disabled (Q153), the 32-bit x86 port is gone (JEP 503), and `sun.misc.Unsafe`'s memory-access methods warn on use as of 24 and **throw** from 26 (JEP 498).

**Why it matters.** The justification isn't the feature list — it's that 21 → 25 is a low-risk upgrade on the same LTS train that removes the main reason teams hesitated on virtual threads. The honest framing: "we get the pinning fix, a supported `ScopedValue`, and a startup lever, for a migration whose main risk is third-party libraries calling `Unsafe`."

**Follow-up: What's the one thing you'd check before scheduling it?**
Run the estate with `--sun-misc-unsafe-memory-access=warn` and see what fires. The methods are terminally deprecated, warn from 24, and throw from 26 — so whatever shows up is not a 25 problem but it is a *26* problem, and you want the inventory before the deadline rather than after. In practice the hits are old bytecode and serialisation libraries, the same set that broke on 8 → 17.

---

### Q144. `synchronized` no longer pins virtual threads. What changed, and what does it mean for adoption?

**Answer.** In Java 21, a virtual thread that blocked inside a `synchronized` block or method could not unmount — it stayed **pinned** to its carrier, holding an OS thread hostage. With a small carrier pool, enough pinned threads deadlocked the application. The standard advice was to audit hot paths and replace `synchronized` with `ReentrantLock`, which is exactly the kind of mechanical, risky, whole-codebase change teams refuse to schedule.

**JEP 491 (JDK 24)** reimplemented the object monitor so a virtual thread can acquire, hold and release a monitor independently of its carrier. Blocking on a monitor now unmounts and frees the carrier, and the thread is remounted when the monitor is available.

What still pins: native frames — a JNI or FFM downcall that blocks, and a few JVM-internal critical sections. The `jdk.VirtualThreadPinned` JFR event now fires only for those.

**Why it matters.** This is the difference between "virtual threads are promising" and "virtual threads are the default". The migration cost of thread-per-request dropped to roughly zero for ordinary Spring/JDBC code, because the `synchronized` in your connection pool and your logging framework stopped being your problem. If you evaluated virtual threads on 21 and shelved them, the evaluation is stale.

**Follow-up: So there's nothing left to audit?**
The audit shrank; it didn't vanish. You still need to bound concurrency — a million virtual threads against a 20-connection pool is the same overload with the queue moved, so semaphores and rate limiters replace pool sizes rather than disappearing (Q53). And `ThreadLocal`-heavy code is a memory problem at scale, which is what `ScopedValue` is for. Pinning was the *blocker*; capacity planning is still the *work*.

---

### Q145. What is `StableValue` and what does it replace?

**Answer.** Preview in Java 25 (JEP 502). A `StableValue` holds a value that is set at most once, some time after construction, and is immutable thereafter — "deferred `final`".

```java
class Orchestrator {
    private final StableValue<Logger> logger = StableValue.of();

    Logger logger() {
        return logger.orElseSet(() -> Logger.create(Orchestrator.class));   // at most once
    }
}
```

There are also `StableValue.supplier(...)`, which wraps the initialising lambda at the declaration site, and `StableValue.list(...)` for a fixed-size list of independently, lazily initialised elements.

It replaces three uncomfortable idioms: **double-checked locking** with a `volatile` field (correct only if you get the `volatile` exactly right — Q57), the **holder-class idiom** (correct, but `static` only, and one extra class per field), and a plain **non-final lazily assigned field** (racy, and never constant-folded).

**Why it matters.** The payoff is not concision, it's optimisation. The JVM treats a stable value's content as a constant once set, so it constant-folds through it exactly as it would through a `final` field. A `volatile` field never gets that. You get lazy initialisation *and* the codegen of an eager `final`, which is the combination that previously did not exist.

**Follow-up: Would you use a preview API in production?**
No — and this section is the reason to say so out loud. String templates were previewed in 21 and withdrawn entirely (Q89). Structured concurrency has re-previewed six times with a reshaped API (Q146). Preview features require `--enable-preview`, which pins you to the exact JDK version that compiled the class file. The right posture is to design so the eventual API drops in cleanly — here, hide it behind your own accessor method — and adopt on finalisation.

---

### Q146. Structured concurrency is still preview in 25. What does the API look like now, and would you use it?

**Answer.** The idea has been stable since JEP 453 (JDK 21): if tasks fan out from one place, their lifetimes should nest like a block, so that an error in one cancels its siblings, the parent cannot return before its children finish, and a thread dump shows the hierarchy. The failure it prevents is the orphaned fan-out — a slow subtask still running, and still holding resources, after the request that spawned it returned.

The **API**, however, has been reshaped repeatedly — six previews, JEP 453 (21) through JEP 525 (26). The earlier `new StructuredTaskScope.ShutdownOnFailure()` form is gone; current code opens a scope through a static factory and supplies a joiner:

```java
try (var scope = StructuredTaskScope.open(Joiner.<Response>allSuccessfulOrThrow())) {
    var fraud   = scope.fork(() -> fraudCheck(payment));
    var balance = scope.fork(() -> balanceCheck(payment));
    scope.join();                       // both, or the first failure cancels the other
    return authorise(fraud.get(), balance.get());
}
```

**Why it matters.** This is the piece that makes virtual threads *structured* rather than just cheap. Without it, thread-per-request plus fan-out reproduces exactly the leak problems that unbounded executors had.

**Follow-up: So what do you actually use today?**
An executor with an explicit timeout and explicit cancellation, or a small helper that wraps the pattern, and a note in the ADR that this is a placeholder. The reason not to adopt the preview isn't stability of the concept — the concept is sound and unchanged across all six rounds — it's that the *type names and signatures* moved every time, so preview code costs a rewrite per JDK. Say that in an interview and you sound like you've maintained something; say "we use structured concurrency" on a 25 codebase and expect to be asked which preview.

---

### Q147. What are stream gatherers and when would you write one?

**Answer.** Final in Java 24 (JEP 485). `Stream::gather(Gatherer)` is to intermediate operations what `collect(Collector)` is to terminal ones: the extension point the Streams API never had. Before it, any operation the JDK didn't ship — sliding windows, running totals, dedupe-by-key, chunking — meant leaving the pipeline.

`java.util.stream.Gatherers` ships five: `fold`, `scan`, `windowFixed`, `windowSliding`, and `mapConcurrent`.

```java
// batch 500 payments per upstream call, without materialising the whole stream
payments.stream()
        .gather(Gatherers.windowFixed(500))
        .map(acquirer::submitBatch)
        .forEach(this::record);
```

A gatherer has up to four pieces — an initialiser for state, an integrator that receives each element and may emit zero or more downstream, an optional combiner for parallelism, and an optional finisher for anything held back at the end. The integrator can signal "stop", so gatherers short-circuit properly.

**Why it matters.** `mapConcurrent` deserves separate mention: it runs a mapping function on virtual threads with a bounded concurrency limit, in encounter order. That is the idiomatic bounded fan-out for I/O-bound work in a stream, and it composes with the bulkhead argument in Q53 rather than fighting it.

**Follow-up: When is a gatherer the wrong answer?**
When a plain loop is clearer. A stateful gatherer with a custom integrator is more machinery than a `for` loop with two local variables, and the team has to read it. The strong cases are the ones where you're already in a long pipeline and the alternative is collecting to a list mid-way — that intermediate `toList()` is the thing gatherers exist to delete.

---

### Q148. What is the Class-File API, and why does it matter if you never call it?

**Answer.** Final in Java 24 (JEP 484). `java.lang.classfile` is a standard, JDK-supplied API for parsing, generating and transforming class files — immutable element trees, lazy parsing, lambda-based builders, rather than ASM's visitor model.

The reason it matters to people who will never write a line of it: **the JDK bundled a fork of ASM internally, and every agent, mocking framework and bytecode-weaving library depends on ASM or something like it.** Those libraries lag each new class-file version, which is precisely why a JDK upgrade historically broke Mockito, Lombok, cglib and Jackson before it broke your code. An API that ships *with* the JDK evolves with the class-file format by construction.

**Why it matters.** It's the structural fix for the most common Java upgrade failure — "we can't move to the new LTS because our test framework can't read the bytecode." Over the next few LTS cycles the ecosystem migrating onto it is what makes upgrades boring.

**Follow-up: Where would you legitimately use it directly?**
Build-time code generation and analysis: a Gradle task that verifies no class in the domain package references an infrastructure package, a coverage or call-graph tool, a compile-time proxy generator. Runtime bytecode generation in application code is still almost always the wrong answer — it defeats AOT, it breaks native images, and it makes stack traces lie.

---

### Q149. What is the Foreign Function & Memory API, and what does it replace?

**Answer.** Final in Java 22 (JEP 454), `java.lang.foreign`. It does two jobs that used to need two bad tools:

- **Call native code** without JNI. No C shim to write, compile and ship per platform; you describe the function's signature and downcall to it from Java.
- **Access off-heap memory** safely. `MemorySegment` is a region with spatial bounds (you cannot read past the end) and temporal bounds (you cannot read it after it's freed). `Arena` owns the lifetime — `confined` for single-threaded deterministic release, `shared` for multi-threaded, `automatic` for GC-managed.

It replaces **JNI** (brittle, a native build per platform, and a crash rather than an exception when you get it wrong) and the memory-access half of **`sun.misc.Unsafe`** — which is terminally deprecated, warns from 24, and throws from 26 (JEP 498). Native access is itself restricted: you enable it per module with `--enable-native-access`, so the JVM can tell you which code is doing it.

**Why it matters.** The `Unsafe` timeline is the actionable part. A large fraction of the Java ecosystem's off-heap code — caches, serialisation libraries, Netty-adjacent buffers — was written against `Unsafe`. The replacements are `VarHandle` for on-heap and `MemorySegment` for off-heap, and the libraries you depend on have to make that move before 26.

**Follow-up: Does this mean you'd write native interop in an ordinary service?**
No. The value is that the libraries underneath you can, safely and without a per-platform build. In application code the FFM API is for the rare case with no Java equivalent — a vendor HSM, a hardware crypto module, an existing C risk engine. Otherwise a bounds-checked, arena-scoped native call is still a native call, with all the deployment consequences.

---

### Q150. What is the AOT cache, and how does it compare to CDS and native image?

**Answer.** Project Leyden's first shipment. **JEP 483 (JDK 24)** caches classes already *loaded and linked* from a training run, so a later start reads them instead of redoing the work. **JEP 514 (25)** simplified the workflow to one step, and **JEP 515 (25)** added method profiles to the cache, so the JIT starts warm rather than from zero.

```bash
java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf -cp app.jar com.example.App   # train
java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf -XX:AOTCache=app.aot -cp app.jar
java -XX:AOTCache=app.aot -cp app.jar com.example.App                                  # run
```

The JEP reports Spring PetClinic starting 42% faster, caching roughly 21,000 classes, at a cost of ~130 MB of cache.

Against the alternatives: **AppCDS** shares parsed class *data* only — the AOT cache goes further by storing linked classes and profiles. **GraalVM native image** compiles ahead of time to a binary with near-instant start and a much smaller footprint, but gives up the JIT's peak throughput, requires closed-world analysis, and turns reflection and dynamic proxies into configuration files. The AOT cache keeps you on HotSpot with unchanged semantics.

**Why it matters.** It puts a real option between "accept slow startup" and "rewrite for native image". For a service that scales to zero or autoscales hard, startup is a cost line, and this is a flag plus a build step rather than an architecture change.

**Follow-up: What's the catch?**
The cache is tied to the JDK version, the classpath and the machine's configuration, so it's a build artefact that must be regenerated with the application and invalidated when either changes — if it doesn't match, the JVM falls back silently to a normal start and you lose the benefit without an error. And the training run has to be *representative*: profile it against a realistic workload, not a smoke test, or you've cached the profile of your health check.

---

### Q151. What are compact object headers and when would you enable them?

**Answer.** A product feature in Java 25 (JEP 519), after being experimental in 24 (JEP 450). It restructures the object header — the mark word plus class pointer — from 12 bytes to 8 on 64-bit with compressed oops.

It is **opt-in**, not the default: `-XX:+UseCompactObjectHeaders`. (In 24 it also needed `-XX:+UnlockExperimentalVMOptions`.)

Four bytes per object sounds trivial until you multiply. `new Object()` goes from 16 bytes to 8 after padding; an `Integer` from 16 to 8 — so the boxing arithmetic behind `Map<Integer,Integer>` improves materially. The JEP cites around 22% less heap on some benchmarks; the win scales with how *many* and how *small* your objects are, which is the profile of most business services.

**Why it matters.** Less heap for the same live set means fewer collections, better cache locality, and more headroom under the same container limit. It's one of the rare changes that is purely a flag, with no code impact — which also means it's one of the few worth actually A/B testing rather than reasoning about.

**Follow-up: Why isn't it the default, and what would you check before turning it on?**
Because anything reading the header layout directly breaks — serialisation and off-heap libraries that assume a 12-byte header, agents, and some profilers and heap-analysis tooling. That is the check: run your real dependency set and your observability stack under the flag in a pre-production environment before believing the heap graph. Measure with JOL rather than inferring, and note the default arithmetic elsewhere in this bank (Q72) assumes headers *off*.

---

### Q152. What changed in the GC landscape between 21 and 25?

**Answer.** Generational collection won, everywhere.

- **ZGC** gained generations in 21 (JEP 439), made them the default in 23 (JEP 474), and the non-generational mode was **removed** in 24 (JEP 490). `-XX:+UseZGC` now means generational ZGC and nothing else; `-XX:+ZGenerational` is an obsolete flag that warns.
- **Shenandoah** gained a generational mode experimentally in 24 (JEP 404) and it became a product feature in 25 (JEP 521). JEP 535 proposes making it the default in 28.
- **G1** remains the default collector and got throughput work along the way (JEP 522 in 26 reduces write-barrier synchronisation).

**Why it matters.** The practical selection advice is unchanged and simpler to state than it was: **G1 unless you have measured a pause problem, then generational ZGC.** What changed is that "which ZGC?" is no longer a question, and the old advice to avoid ZGC for allocation-heavy workloads — because it traced the whole heap every cycle — is obsolete. Anything you read predating 21 on this is misleading (Q73, Q74).

**Follow-up: Does the generational hypothesis apply differently to a concurrent collector?**
The hypothesis is a property of the *workload*, not the collector: most objects die young regardless. A non-generational concurrent collector still benefited from it — dead objects are never traced — it just couldn't *exploit* it, because it had no cheap young collection and had to scan everything each cycle. Adding generations lets it do frequent small young collections and touch the old generation rarely, which is why the change was worth the considerable implementation effort.

---

### Q153. The Security Manager is permanently disabled. What breaks, and what replaces it?

**Answer.** JEP 486 (JDK 24) finished a removal that began with deprecation in 17 (JEP 411). Concretely, as of 24:

- Starting the JVM with `-Djava.security.manager` is an **error** — the JVM refuses to start.
- `System.setSecurityManager()` throws `UnsupportedOperationException`.
- `System.getSecurityManager()` returns `null`; `AccessController.doPrivileged()` simply runs the action with no privilege elevation; `Policy.setPolicy()` throws.

The classes remain so old code links, but nothing they promise is enforced.

**Why it matters.** It was never a working sandbox for untrusted code in a server process — the threat model it was designed for (applets) is gone, the permission model was unusable at scale, and almost nobody ran with it enabled. The replacement is not an API: it's **isolation at the layer below** — containers, seccomp, a non-root user, read-only filesystems, network policy, and a separate process or VM for anything genuinely untrusted.

**Follow-up: How would you find out whether this affects you?**
Grep the dependency tree, not your own code — the risk is a library that calls `doPrivileged` or installs a policy on your behalf, and older application servers and some crypto and plugin frameworks did. The failure is quiet: `doPrivileged` silently stops elevating rather than throwing, so a permission check that used to pass may now behave differently. This is one of the few 21 → 25 items that deserves an explicit test rather than a build-passes check.

---

### Q154. Module imports, compact source files, flexible constructor bodies — which belong in production code?

**Answer.** Three finals in Java 25, and they are not equally useful.

**Flexible constructor bodies (JEP 513)** — genuinely useful. Statements are now allowed *before* `super(...)` or `this(...)`, in a **prologue**. Prologues run bottom-up, then the constructor bodies run top-down. The prologue may not read `this` — no instance fields or methods, no `super` — but it may validate arguments and assign this class's own uninitialised fields.

```java
public PaymentRequest(Money amount) {
    if (amount.isNegative()) throw new IllegalArgumentException("negative amount");  // now legal
    super(amount.currency());
}
```

Previously that check had to move into a static helper inside the `super(...)` argument list, or happen after the superclass constructor had already run — which matters when the superclass constructor calls an overridable method.

**Module import declarations (JEP 511)** — `import module java.base;` imports every public type from a module's exported packages. Convenient for scripts and teaching; in production it reintroduces the wildcard-import ambiguity problem at a much larger scale. Name clashes are a compile error, resolved by adding a more specific import.

**Compact source files and instance `main` (JEP 512)** — a file with no class declaration and `void main()`, plus `java.lang.IO` for `println`/`readln`. Explicitly for learners and single-file scripts.

```java
void main() {
    IO.println("Hello");
}
```

**Why it matters.** The senior read is that JEP 512 is a teaching feature and JEP 511 is a convenience feature, and treating either as "the new style" for a codebase is a misreading of their stated purpose. JEP 513 is the one that changes how you write a class you'd ship.

**Follow-up: Is there a real use for compact source files in a professional codebase?**
Build and ops scripting, where the alternative is a shell script or Python. `java script.java` has run single-file programs directly since 11, and a compact source file with `IO.println` removes the remaining boilerplate — so a deployment or data-fix script can be written in the same language, with the same types and the same libraries, as the service it operates on. That's a genuine niche. It is not a reason to delete `public class` from your services.

---

## Closing notes

A few patterns worth internalising before you walk in:

**Answer in layers.** Give a one-sentence direct answer, then the mechanism, then the trade-off. Let the interviewer pull you deeper rather than dumping everything at once — a five-minute monologue reads as poor judgement even when every sentence is correct.

**Bring the production story.** For any topic here, have one real incident ready: the deadlock you found, the OOM you diagnosed, the N+1 that appeared at scale, the double charge caused by a missing idempotency key. Concrete experience beats a perfect textbook answer every time.

**Say "I don't know" cleanly.** Then say how you'd find out. Senior candidates are not distinguished by knowing everything — they're distinguished by calibrated confidence. Bluffing a JVM internals answer to an interviewer who works on the JVM is far worse than admitting the edge.

**Own your opinions.** Several questions here (checked exceptions, reactive vs virtual threads, JPA vs SQL, mocking) have no correct answer. Having a defensible position and knowing the counterargument is the signal being tested.
