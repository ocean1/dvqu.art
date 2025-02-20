# C++ Template Unrolling in NVCC

NVCC and generally C++ users can have a hard time unrolling loops in templates ([NVCC won't unroll for loop](https://forums.developer.nvidia.com/t/nvcc-wont-unroll-for-loop/21106)], and get to convoluted solutions [Loop Unrolling Over Template Arguments](https://www.codeproject.com/Articles/75423/Loop-Unrolling-over-Template-Arguments)) or end up having to define macros for everything, what are templates good for then? 

The solution? `__attribute__((unroll(N)))`.

The problem is that the good old `#pragma unroll` just doesn't cut it, it's still interpreted as a preprocessor directive, so it won't work for template arguments.

Without properly deducing the trip count, and propagating constants, loop unrolling cannot happen, impacting performance. Adding to this, memory accesses that cannot be determined at compile time will translate in NVCC using off-chip memory pools increasing latency.

Hinting the compiler to unroll is just as easy as:
```C++
template <cint N>
void doit() {
    __attribute__((unroll(N)))
    for (int i = 0; i < N; ++i) {
        a[i] = b[i] + c[i];
    }
}
```

It doesn't seem [documented anywhere](https://clang.llvm.org/docs/AttributeReference.html#pragma-unroll-pragma-nounroll), but it seemed strange at first that there wouldn't be a corresponding attribute for unroll, and I had to try. Turns out there is, at least in NVCC/clang. :)

Constants propagation might still not be working perfectly, therefore where possible, better defining the arguments as consts: `template <const int N>`.