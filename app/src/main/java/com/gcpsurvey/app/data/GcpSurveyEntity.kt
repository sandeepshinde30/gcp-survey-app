package com.gcpsurvey.app.data

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

// ===================== Room Entity =====================

@Entity(tableName = "gcp_surveys")
data class GcpSurveyEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: String,
    val projectName: String,
    val city: String,
    val operatorName: String,
    val gcpId: String,
    val stationType: String = "gcp",
    val surveyMode: String = "rtk",
    val pointMarkType: String = "nail",
    val pointStatus: String,
    val startTime: String? = null,
    val endTime: String? = null,
    val totalObservationTime: String? = null,
    val antennaHeight: Double,
    val latitude: Double,
    val longitude: Double,
    val altitude: Double?,
    val accuracy: Float?,
    val hotelLatitude: Double?,
    val hotelLongitude: Double?,
    val previousPointType: String,
    val previousPointId: String?,
    val segmentDistanceMeters: Double,
    val accumulatedDistanceMeters: Double,
    val folderPath: String,
    val photosJson: String,
    val distanceSynced: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

// ===================== DAO =====================

@Dao
interface GcpDao {

    @Query("SELECT * FROM gcp_surveys ORDER BY createdAt DESC")
    fun getAllRecords(): Flow<List<GcpSurveyEntity>>

    @Query("SELECT * FROM gcp_surveys ORDER BY createdAt DESC")
    suspend fun getAllRecordsSync(): List<GcpSurveyEntity>

    @Query("SELECT * FROM gcp_surveys WHERE id = :id LIMIT 1")
    suspend fun getRecordById(id: Long): GcpSurveyEntity?

    @Query("SELECT * FROM gcp_surveys WHERE gcpId = :gcpId ORDER BY createdAt DESC LIMIT 1")
    suspend fun getLatestByGcpId(gcpId: String): GcpSurveyEntity?

    @Query("SELECT * FROM gcp_surveys WHERE segmentDistanceMeters = 0 AND hotelLatitude IS NOT NULL AND hotelLongitude IS NOT NULL AND distanceSynced = 0")
    suspend fun getPendingRecords(): List<GcpSurveyEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: GcpSurveyEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(records: List<GcpSurveyEntity>)

    @Update
    suspend fun updateRecord(record: GcpSurveyEntity)

    @Query("DELETE FROM gcp_surveys WHERE id = :id")
    suspend fun deleteRecordById(id: Long)

    @Query("DELETE FROM gcp_surveys")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM gcp_surveys")
    suspend fun count(): Int
}
// ✅ File end
