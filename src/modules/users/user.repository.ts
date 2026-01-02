import { prisma } from "../../infrastructure/database/prisma";
import type { User } from "@prisma/client";

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async create(data: { email: string; firstName: string; lastName: string }): Promise<User> {
    return prisma.user.create({
      data,
    });
  },
};