import { prisma } from "../../infrastructure/database/prisma";
import type { Enrollment, EnrollmentStatus } from "@prisma/client";

export interface CreateEnrollmentData {
  userId: string;
  courseId: string;
  status?: EnrollmentStatus;
  enrolledAt?: Date | null;
}

export const enrollmentRepository = {
  async findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
  },

  async findByUserId(userId: string): Promise<Enrollment[]> {
    return prisma.enrollment.findMany({
      where: { userId },
      include: { course: true },
    });
  },

  async create(data: CreateEnrollmentData): Promise<Enrollment> {
    return prisma.enrollment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        status: data.status ?? "PENDING",
        enrolledAt: data.enrolledAt ?? null,
      },
    });
  },

  async activate(userId: string, courseId: string): Promise<Enrollment> {
    return prisma.enrollment.update({
      where: {
        userId_courseId: { userId, courseId },
      },
      data: {
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
    });
  },

  async upsertActive(userId: string, courseId: string): Promise<Enrollment> {
    return prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      create: {
        userId,
        courseId,
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
      update: {
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
    });
  },
};