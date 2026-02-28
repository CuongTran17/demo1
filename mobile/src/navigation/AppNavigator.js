import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Student
import HomeScreen from '../screens/student/HomeScreen';
import CourseDetailScreen from '../screens/student/CourseDetailScreen';
import CartScreen from '../screens/student/CartScreen';
import MyCoursesScreen from '../screens/student/MyCoursesScreen';
import LearningScreen from '../screens/student/LearningScreen';
import AccountScreen from '../screens/student/AccountScreen';
import OrdersScreen from '../screens/student/OrdersScreen';
import SearchScreen from '../screens/student/SearchScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';

// Teacher
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';

import { useCart } from '../context/CartContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Auth Stack ──────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// ─── Student Tabs ────────────────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'PTIT Learning' }} />
    <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: 'Chi tiết khóa học' }} />
    <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
    <Stack.Screen name="Learning" component={LearningScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const MyCoursesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MyCoursesMain" component={MyCoursesScreen} options={{ title: 'Khóa học của tôi' }} />
    <Stack.Screen name="Learning" component={LearningScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const CartStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="CartMain" component={CartScreen} options={{ title: 'Giỏ hàng' }} />
  </Stack.Navigator>
);

const AccountStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AccountMain" component={AccountScreen} options={{ title: 'Tài khoản' }} />
    <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Lịch sử đơn hàng' }} />
    <Stack.Screen name="MyCourses" component={MyCoursesScreen} options={{ title: 'Khóa học của tôi' }} />
  </Stack.Navigator>
);

const StudentTabs = () => {
  const { count } = useCart();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { paddingBottom: 4, height: 56 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MyCourses') iconName = focused ? 'book' : 'book-outline';
          else if (route.name === 'Cart') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="MyCourses" component={MyCoursesStack} options={{ title: 'Khóa học' }} />
      <Tab.Screen
        name="Cart"
        component={CartStack}
        options={{
          title: 'Giỏ hàng',
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, fontSize: 10 },
        }}
      />
      <Tab.Screen name="Account" component={AccountStack} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
};

// ─── Admin Tabs ──────────────────────────────────────────────
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: { paddingBottom: 4, height: 56 },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
        else if (route.name === 'Users') iconName = focused ? 'people' : 'people-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Quản trị' }} />
    <Tab.Screen name="Users" component={UserManagementScreen} options={{ title: 'Người dùng' }} />
  </Tab.Navigator>
);

// ─── Teacher Stack ───────────────────────────────────────────
const TeacherStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TeacherMain" component={TeacherDashboardScreen} options={{ title: 'Giảng viên' }} />
  </Stack.Navigator>
);

// ─── Root Navigator ──────────────────────────────────────────
const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // splash / loading handled by AuthContext

  if (!user) return <AuthStack />;

  // Role-based routing
  const role = user.role;
  if (role === 'admin') return <AdminTabs />;
  if (role === 'teacher') return <TeacherStack />;
  return <StudentTabs />;
};

export default AppNavigator;
