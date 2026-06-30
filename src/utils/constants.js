export const userRolesEnum = {
    MEMBER: "member",
    ADMIN: "admin",
    Project_Admin: "project_Admin"
}

export const availableRoles = Object.values(userRolesEnum);

export const taskStatusEnum = {
    
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    
}

export const availableTaskStatus = Object.values(taskStatusEnum);