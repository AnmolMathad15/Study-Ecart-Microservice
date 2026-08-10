import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STAFF"]);
export const studentStatusEnum = pgEnum("student_status", [
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
]);

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("STAFF"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const departmentsTable = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    description: varchar("description", { length: 500 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("departments_name_unique").on(table.name),
    uniqueIndex("departments_code_unique").on(table.code),
  ],
);

export const coursesTable = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    duration: integer("duration").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departmentsTable.id, { onDelete: "restrict" }),
    description: varchar("description", { length: 500 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("courses_code_unique").on(table.code)],
);

export const studentsTable = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    studentId: varchar("student_id", { length: 20 }).notNull(),
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: genderEnum("gender").notNull(),
    address: varchar("address", { length: 250 }),
    city: varchar("city", { length: 80 }),
    state: varchar("state", { length: 80 }),
    pincode: varchar("pincode", { length: 6 }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departmentsTable.id, { onDelete: "restrict" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "restrict" }),
    semester: integer("semester").notNull(),
    admissionYear: integer("admission_year").notNull(),
    profileImage: text("profile_image"),
    status: studentStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("students_student_id_unique").on(table.studentId),
    uniqueIndex("students_email_unique").on(table.email),
    uniqueIndex("students_phone_unique").on(table.phone),
  ],
);

export const attendanceTable = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    status: attendanceStatusEnum("status").notNull(),
    remarks: varchar("remarks", { length: 250 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("attendance_student_date_unique").on(table.studentId, table.date)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
export type Course = typeof coursesTable.$inferSelect;
export type Student = typeof studentsTable.$inferSelect;
export type Attendance = typeof attendanceTable.$inferSelect;
export type UserRole = z.infer<typeof insertUserSchema>["role"];