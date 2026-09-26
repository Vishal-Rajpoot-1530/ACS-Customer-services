import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';
import { AuthenticatedUserResponse } from '../types/auth.types';
import { documentRepository } from '../repositories/document.repository';
import { s3Service } from './s3.service';
import { userId as getUserId } from '../models/user.model';
import { documentId } from '../models/document.model';
import { explorerRepository, ExplorerState } from '../repositories/explorer.repository';

const ROOT_FOLDER_ID = 'root';

export class UserService {
  async getExplorer(userId: string): Promise<ExplorerState> {
    return explorerRepository.getByUserId(userId);
  }

  async saveExplorer(userId: string, state: ExplorerState): Promise<ExplorerState> {
    const folderIds = new Set(state.folders.map((folder) => folder.id));
    for (const folder of state.folders) {
      if (folder.parentId && !folderIds.has(folder.parentId)) {
        throw new AppError('Folder parent does not exist', HttpStatusCodes.BAD_REQUEST, 'INVALID_FOLDER_PARENT');
      }
    }
    for (const folderId of Object.values(state.assignments)) {
      if (folderId !== ROOT_FOLDER_ID && !folderIds.has(folderId)) {
        throw new AppError('Document assignment references an unknown folder', HttpStatusCodes.BAD_REQUEST, 'INVALID_FOLDER_ASSIGNMENT');
      }
    }

    await explorerRepository.replaceForUser(userId, state);
    return explorerRepository.getByUserId(userId);
  }

  async listUsers(): Promise<AuthenticatedUserResponse[]> {
    const users = await userRepository.findAll();
    return users.map((user) => ({
      id: getUserId(user),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      photoURL: user.photoURL,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
    }));
  }

  async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    if (userId === requestingUserId) {
      throw new AppError('Administrators cannot delete their own account', HttpStatusCodes.BAD_REQUEST, 'SELF_DELETE_FORBIDDEN');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }
    if (user.role !== 'USER') {
      throw new AppError(
        'The single administrator account cannot be deleted',
        HttpStatusCodes.FORBIDDEN,
        'SINGLE_ADMIN_REQUIRED'
      );
    }

    const documents = await documentRepository.findByOwnerId(userId);
    await Promise.all(documents.map(async (document) => {
      try {
        await s3Service.deleteFile(document.s3Key);
      } catch {
        // The database record is still removed when the storage object is missing.
      }
      await documentRepository.deleteById(documentId(document));
    }));

    await explorerRepository.deleteByUserId(userId);
    await userRepository.deleteById(userId);
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; photoURL?: string }
  ): Promise<AuthenticatedUserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }

    if (data.displayName) user.displayName = data.displayName.trim();
    if (data.photoURL !== undefined) user.photoURL = data.photoURL;

    await userRepository.updateById(getUserId(user), {
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    return {
      id: getUserId(user),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      photoURL: user.photoURL,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
    };
  }
}

export const userService = new UserService();
