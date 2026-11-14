<template>
  <div class="school-shimmer" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">Loading</span>
    <div class="school-shimmer__hero">
      <div class="school-shimmer__block school-shimmer__avatar" />
      <div class="school-shimmer__hero-text">
        <div class="school-shimmer__line school-shimmer__line--sm" />
        <div class="school-shimmer__line school-shimmer__line--lg" />
        <div class="school-shimmer__line school-shimmer__line--md" />
      </div>
    </div>
    <div class="school-shimmer__cards">
      <div
        v-for="i in 4"
        :key="i"
        class="school-shimmer__block school-shimmer__card"
      />
    </div>
    <div class="school-shimmer__panel">
      <div class="school-shimmer__line school-shimmer__line--md" />
      <div
        v-for="i in 6"
        :key="i"
        class="school-shimmer__row"
      >
        <div class="school-shimmer__line school-shimmer__line--flex" />
        <div class="school-shimmer__line school-shimmer__line--sm" />
        <div class="school-shimmer__line school-shimmer__line--xs" />
      </div>
    </div>
  </div>
</template>