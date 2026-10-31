package com.gcpsurvey.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface GcpDao {
    @Query("SELECT * FROM gcp_surveys ORDER BY createdAt DESC")
    fun getAllRecords(): Flow<List<GcpSurveyEntity>>

    @Query("SELECT * FROM gcp_surveys ORDER BY createdAt DESC")
    suspend fun getAllRecordsSync(): List<GcpSurveyEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: GcpSurveyEntity): Long

    @Delete
    suspend fun deleteRecord(record: GcpSurveyEntity)

    @Query("DELETE FROM gcp_surveys")
    suspend fun deleteAll()

    // --- ये दो नई लाइनें जोड़ी गई हैं ---
    @Query("SELECT * FROM gcp_surveys WHERE segmentDistanceMeters = 0.0")
    suspend fun getPendingRecords(): List<GcpSurveyEntity>

    @Update
    suspend fun updateRecord(record: GcpSurveyEntity)
}
