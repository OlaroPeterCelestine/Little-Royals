import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { catalog } from './data/catalog'
import { isAuthenticated, authSession } from './data/auth'

type ModuleKey = keyof typeof catalog

const catalogKeys = Object.keys(catalog) as ModuleKey[]

const specialListPaths = new Set([
  '/students',
  '/teachers',
  '/classes',
  '/attendance',
  '/announcements',
  '/school-events',
  '/sms-messages',
  '/communications',
  '/payments',
  '/payment',
  '/gradebook',
  '/report-cards',
  '/parent-portal',
])

const specialDetailPaths = new Set([
  '/students/:id',
  '/teachers/:id',
  '/classes/:id',
  '/attendance/:id',
])

function withModuleParam(key: ModuleKey) {
  return (to: RouteLocationNormalized) => {
    to.params.module = key
  }
}

const catalogListRoutes: RouteRecordRaw[] = catalogKeys
  .map((key) => ({
    path: `/${key}`,
    name: key,
    component: () => import('./pages/MasterList.vue'),
  }))
  .filter((r) => !specialListPaths.has(r.path))

const catalogDetailRoutes: RouteRecordRaw[] = catalogKeys
  .map((key) => ({
    path: `/${key}/:id`,
    name: `${key}-detail`,
    component: () => import('./pages/RecordDetail.vue'),
    beforeEnter: withModuleParam(key),
  }))
  .filter((r) => !specialDetailPaths.has(r.path))

function detailRoute(key: ModuleKey, path: string, name: string): RouteRecordRaw {
  return {
    path,
    name,
    component: () => import('./pages/RecordDetail.vue'),
    beforeEnter: withModuleParam(key),
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('./pages/Dashboard.vue'),
    },
    { path: '/dashboard', redirect: '/' },
    {
      path: '/students',
      name: 'students',
      component: () => import('./pages/Students.vue'),
    },
    {
      path: '/students/:id',
      name: 'students-detail',
      component: () => import('./pages/Student360.vue'),
    },
    {
      path: '/teachers',
      name: 'teachers',
      component: () => import('./pages/MasterList.vue'),
    },
    {
      path: '/teachers/:id',
      name: 'teachers-detail',
      component: () => import('./pages/Teacher360.vue'),
    },
    {
      path: '/classes',
      name: 'classes',
      component: () => import('./pages/MasterList.vue'),
    },
    detailRoute('classes', '/classes/:id', 'classes-detail'),
    {
      path: '/attendance',
      name: 'attendance',
      component: () => import('./pages/MasterList.vue'),
    },
    detailRoute('attendance', '/attendance/:id', 'attendance-detail'),
    {
      path: '/announcements',
      name: 'announcements',
      component: () => import('./pages/Announcements.vue'),
    },
    {
      path: '/communications',
      name: 'communications',
      component: () => import('./pages/Communications.vue'),
    },
    {
      path: '/sms-messages',
      name: 'sms-messages',
      component: () => import('./pages/Communications.vue'),
    },
    {
      path: '/parent-portal',
      name: 'parent-portal',
      component: () => import('./pages/ParentPortal.vue'),
    },
    {
      path: '/payment',
      name: 'payment-admin',
      component: () => import('./pages/PaymentAdmin.vue'),
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('./pages/Payments.vue'),
    },
    {
      path: '/gradebook',
      name: 'gradebook',
      component: () => import('./pages/Gradebook.vue'),
    },
    {
      path: '/report-cards',
      name: 'report-cards',
      component: () => import('./pages/ReportCards.vue'),
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('./pages/SchoolCalendar.vue'),
    },
    {
      path: '/school-events',
      name: 'school-events',
      component: () => import('./pages/SchoolCalendar.vue'),
    },
    {
      path: '/school-events/list',
      name: 'school-events-list',
      component: () => import('./pages/MasterList.vue'),
      beforeEnter: withModuleParam('school-events'),
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('./pages/Reports.vue'),
    },
    {
      path: '/documents',
      name: 'documents',
      component: () => import('./pages/Documents.vue'),
    },
    {
      path: '/scan',
      name: 'document-scan',
      component: () => import('./pages/DocumentScan.vue'),
    },
    {
      path: '/school-setup',
      name: 'school-setup',
      component: () => import('./pages/SchoolSetup.vue'),
    },
    {
      path: '/activity-log',
      name: 'activity-log',
      component: () => import('./pages/ActivityLog.vue'),
    },
    {
      path: '/permissions',
      redirect: { path: '/users', query: { tab: 'roles' } },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('./pages/Users.vue'),
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('./pages/UserProfile.vue'),
    },
    {
      path: '/me',
      name: 'me',
      component: () => import('./pages/UserProfile.vue'),
    },
    { path: '/profile', redirect: '/me' },
    ...catalogDetailRoutes,
    ...catalogListRoutes,
    {
      path: '/:path(.*)*',
      name: 'not-found',
      component: () => import('./pages/NotFound.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const publicRoute = to.meta.public === true || to.name === 'login'
  if (!isAuthenticated.value && !publicRoute) {
    return {
      name: 'login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    }
  }
  const isParent = authSession.value?.role === 'Parent'
  if (isAuthenticated.value && to.name === 'login') {
    return { path: isParent ? '/parent-portal' : '/' }
  }
  if (isParent && (to.path === '/' || to.name === 'dashboard')) {
    return { path: '/parent-portal' }
  }
  return true
})
