import Activity from '#models/activity'
import EntityGroup from '#models/entity_group'
import Folder from '#models/folder'
import User from '#models/user'

export class ActivityService {
  public async logUserAction(
    user: User,
    status: string,
    activityModel: User | Folder | EntityGroup,
    description: string
  ) {
    const activity = new Activity()
    activity.user_id = user.id
    activity.status = status
    activity.description = description

    await activity.related('activities').associate(activityModel)

    await activity.save()
  }

  public static async getActivityByType(
    activityModel: User | Folder | EntityGroup
  ): Promise<Partial<Activity>[]> {
    const activities = await Activity.query()
      .select(['description', 'created_at', 'id'])
      .whereHas('activities', (query) => {
        query
          .where('activity_type', activityModel.constructor.name)
          .where('activity_id', activityModel.id)
      })

    return activities.map((activity) => {
      return {
        id: activity.id,
        description: activity.description,
        createdAt: activity.createdAt,
      }
    })
  }
}
