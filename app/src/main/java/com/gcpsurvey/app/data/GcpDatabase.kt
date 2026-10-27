package com.gcpsurvey.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [GcpSurveyEntity::class], version = 1, exportSchema = false)
abstract class GcpDatabase : RoomDatabase() {
    abstract fun gcpDao(): GcpDao

    companion object {
        @Volatile
        private var INSTANCE: GcpDatabase? = null

        fun getDatabase(context: Context): GcpDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    GcpDatabase::class.java,
                    "gcp_survey_database.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
