/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Compass,
  CheckCircle2,
  Trash2,
  Eye,
  Crosshair,
  Sliders,
  Ruler,
  Folder,
  MapPin,
  FileCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PhotoType, PhotoInfo, GpsCoordinates } from '../types';
import { CameraModal } from './CameraModal';

interface PhotoGridProps {
  photos: Partial<Record<PhotoType, PhotoInfo>>;
  onPhotoCaptured: (info: PhotoInfo) => void;
  onPhotoRemoved: (type: PhotoType) => void;
  gcpId: string;
  projectName: string;
  antennaHeight: number;
  operatorName: string;
  currentGps: GpsCoordinates | null;
}

interface PhotoSlotDefinition {
  type: PhotoType;
  title: string;
  category: 'side' | 'point' | 'equipment' | 'other';
  icon: React.ReactNode;
  subtitle: string;
  folderFilename: string;
}

const PHOTO_SLOTS: PhotoSlotDefinition[] = [
  // 1. 4 Side photos
  {
    type: 'east',
    title: 'East Side',
    category: 'side',
    icon: <Compass className="w-4 h-4 text-amber-500" />,
    subtitle: 'Facing East (90°)',
    folderFilename: 'Side_East.jpg',
  },
  {
    type: 'south',
    title: 'South Side',
    category: 'side',
    icon: <Compass className="w-4 h-4 text-emerald-500" />,
    subtitle: 'Facing South (180°)',
    folderFilename: 'Side_South.jpg',
  },
  {
    type: 'west',
    title: 'West Side',
    category: 'side',
    icon: <Compass className="w-4 h-4 text-blue-500" />,
    subtitle: 'Facing West (270°)',
    folderFilename: 'Side_West.jpg',
  },
  {
    type: 'north',
    title: 'North Side',
    category: 'side',
    icon: <Compass className="w-4 h-4 text-red-500" />,
    subtitle: 'Facing North (0°)',
    folderFilename: 'Side_North.jpg',
  },

  // 2. Point Ground Mark Photos (Nail, Mark, Close-up)
  {
    type: 'point_nail',
    title: 'Point Nail Photo',
    category: 'point',
    icon: <MapPin className="w-4 h-4 text-rose-500" />,
    subtitle: 'PK Nail / Steel Spike in Ground',
    folderFilename: 'Point_Nail.jpg',
  },
  {
    type: 'point_mark',
    title: 'Point Mark Photo',
    category: 'point',
    icon: <Crosshair className="w-4 h-4 text-indigo-500" />,
    subtitle: 'Paint Cross / Chiseled Mark',
    folderFilename: 'Point_Mark.jpg',
  },
  {
    type: 'point_closeup',
    title: 'Close-up Ground View',
    category: 'point',
    icon: <FileCheck className="w-4 h-4 text-teal-500" />,
    subtitle: 'Pole Base on Ground Mark',
    folderFilename: 'Point_Closeup.jpg',
  },

  // 3. Equipment verification photos
  {
    type: 'bubble',
    title: 'Bubble Level',
    category: 'equipment',
    icon: <Crosshair className="w-4 h-4 text-indigo-500" />,
    subtitle: 'Prism / GNSS Bubble Centered',
    folderFilename: 'Equip_Bubble.jpg',
  },
  {
    type: 'tripod',
    title: 'Tripod Setup',
    category: 'equipment',
    icon: <Sliders className="w-4 h-4 text-purple-500" />,
    subtitle: 'Stable Legs & Tribrach Grounding',
    folderFilename: 'Equip_Tripod.jpg',
  },
  {
    type: 'antenna',
    title: 'Antenna Height',
    category: 'equipment',
    icon: <Ruler className="w-4 h-4 text-cyan-600" />,
    subtitle: 'Tape Measure at Reference Mark',
    folderFilename: 'Equip_AntennaTape.jpg',
  },

  // 4. Other 4 field photos requested
  {
    type: 'other_1',
    title: 'Other Photo 1',
    category: 'other',
    icon: <Camera className="w-4 h-4 text-slate-600" />,
    subtitle: 'Surroundings & Sky Clearance',
    folderFilename: 'Other_1_Surroundings.jpg',
  },
  {
    type: 'other_2',
    title: 'Other Photo 2',
    category: 'other',
    icon: <Camera className="w-4 h-4 text-slate-600" />,
    subtitle: 'Access Path & Site Overview',
    folderFilename: 'Other_2_AccessPath.jpg',
  },
  {
    type: 'other_3',
    title: 'Other Photo 3',
    category: 'other',
    icon: <Camera className="w-4 h-4 text-slate-600" />,
    subtitle: 'Nearby Landmarks / Reference',
    folderFilename: 'Other_3_Landmarks.jpg',
  },
  {
    type: 'other_4',
    title: 'Other Photo 4',
    category: 'other',
    icon: <Camera className="w-4 h-4 text-slate-600" />,
    subtitle: 'Extra Field Documentation',
    folderFilename: 'Other_4_Extra.jpg',
  },
];

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoCaptured,
  onPhotoRemoved,
  gcpId,
  projectName,
  antennaHeight,
  operatorName,
  currentGps,
}) => {
  const [activeCaptureSlot, setActiveCaptureSlot] = useState<PhotoSlotDefinition | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'side' | 'point' | 'equipment' | 'other'>('all');

  const sidePhotos = PHOTO_SLOTS.filter((s) => s.category === 'side');
  const pointPhotos = PHOTO_SLOTS.filter((s) => s.category === 'point');
  const equipmentPhotos = PHOTO_SLOTS.filter((s) => s.category === 'equipment');
  const otherPhotos = PHOTO_SLOTS.filter((s) => s.category === 'other');

  const capturedCount = Object.keys(photos).length;
  const cleanProj = (projectName || 'Project').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanOp = (operatorName || 'Operator').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanGcp = (gcpId || 'GCP_001').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const currentFolderName = `${cleanProj}/${cleanOp}/${cleanGcp}/`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                GCP Photo Documentation
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                {capturedCount} / {PHOTO_SLOTS.length} Captured
              </span>
            </div>
            <p className="text-xs text-slate-500">
              4 Side Photos • Ground Point (Nail / Mark) • Equipment • 4 Other Photos
            </p>
          </div>
        </div>

        {/* Dedicated Folder Path Indicator & Storage Optimization Badge */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 text-xs font-mono border border-slate-200">
            <Folder className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500 font-sans">Storage Folder:</span>
            <span className="font-bold text-blue-700">{currentFolderName}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] font-mono border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>1080p/720p @ Q:80 (~200KB)</span>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          All Photos ({PHOTO_SLOTS.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('side')}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'side'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          4 Side Photos ({sidePhotos.filter((s) => photos[s.type]).length}/4)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('point')}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'point'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          Ground Point (Nail/Mark) ({pointPhotos.filter((s) => photos[s.type]).length}/3)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'equipment'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          Equipment Verification ({equipmentPhotos.filter((s) => photos[s.type]).length}/3)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('other')}
          className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'other'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          Other 4 Photos ({otherPhotos.filter((s) => photos[s.type]).length}/4)
        </button>
      </div>

      <div className="space-y-4">
        {/* Category 1: 4 Side Photos */}
        {(activeTab === 'all' || activeTab === 'side') && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Cardinal Side Photos (4 Directions)</span>
              <span className="text-[11px] text-slate-400 font-normal">East, South, West, North</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sidePhotos.map((slot) => (
                <PhotoSlotCard
                  key={slot.type}
                  slot={slot}
                  gcpId={gcpId}
                  photo={photos[slot.type]}
                  onCapture={() => setActiveCaptureSlot(slot)}
                  onPreview={() => photos[slot.type] && setPreviewPhoto(photos[slot.type]!)}
                  onRemove={() => onPhotoRemoved(slot.type)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category 2: Point Ground Mark Photos (Nail, Mark, Close-up) */}
        {(activeTab === 'all' || activeTab === 'point') && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. Ground Point Photos (Nail, Mark, Close-up)</span>
              <span className="text-[11px] text-slate-400 font-normal">Neal / PK Nail, Paint / Chisel Mark</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {pointPhotos.map((slot) => (
                <PhotoSlotCard
                  key={slot.type}
                  slot={slot}
                  gcpId={gcpId}
                  photo={photos[slot.type]}
                  onCapture={() => setActiveCaptureSlot(slot)}
                  onPreview={() => photos[slot.type] && setPreviewPhoto(photos[slot.type]!)}
                  onRemove={() => onPhotoRemoved(slot.type)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category 3: Equipment verification photos */}
        {(activeTab === 'all' || activeTab === 'equipment') && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>3. Equipment Verification Photos (Bubble, Tripod, Antenna)</span>
              <span className="text-[11px] text-slate-400 font-normal">Level centering, Tripod grounding, Tape measurement</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {equipmentPhotos.map((slot) => (
                <PhotoSlotCard
                  key={slot.type}
                  slot={slot}
                  gcpId={gcpId}
                  photo={photos[slot.type]}
                  onCapture={() => setActiveCaptureSlot(slot)}
                  onPreview={() => photos[slot.type] && setPreviewPhoto(photos[slot.type]!)}
                  onRemove={() => onPhotoRemoved(slot.type)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category 4: Other 4 Field Photos */}
        {(activeTab === 'all' || activeTab === 'other') && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>4. Other Field Documentation Photos (4 Photos)</span>
              <span className="text-[11px] text-slate-400 font-normal">Surroundings, Access path, Landmarks, Extra site views</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {otherPhotos.map((slot) => (
                <PhotoSlotCard
                  key={slot.type}
                  slot={slot}
                  gcpId={gcpId}
                  photo={photos[slot.type]}
                  onCapture={() => setActiveCaptureSlot(slot)}
                  onPreview={() => photos[slot.type] && setPreviewPhoto(photos[slot.type]!)}
                  onRemove={() => onPhotoRemoved(slot.type)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for active photo capture */}
      {activeCaptureSlot && (
        <CameraModal
          photoType={activeCaptureSlot.type}
          title={activeCaptureSlot.title}
          category={activeCaptureSlot.category}
          gcpId={gcpId}
          projectName={projectName}
          antennaHeight={antennaHeight}
          operatorName={operatorName}
          currentGps={currentGps}
          onPhotoCaptured={onPhotoCaptured}
          onClose={() => setActiveCaptureSlot(null)}
        />
      )}

      {/* Preview Full Size Photo Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm">
                  {currentFolderName}
                  {previewPhoto.title}.jpg
                </span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black">
              {previewPhoto.dataUrl && (
                <img
                  src={previewPhoto.dataUrl}
                  alt={previewPhoto.title}
                  className="max-h-[70vh] object-contain rounded"
                />
              )}
            </div>
            {previewPhoto.latitude && (
              <div className="p-3 bg-slate-950 text-xs font-mono text-slate-300 flex justify-between">
                <span>Lat: {previewPhoto.latitude.toFixed(6)}°</span>
                <span>Lon: {previewPhoto.longitude?.toFixed(6)}°</span>
                <span className="text-emerald-400 font-sans">EXIF Verified</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface PhotoSlotCardProps {
  slot: PhotoSlotDefinition;
  gcpId: string;
  photo?: PhotoInfo;
  onCapture: () => void;
  onPreview: () => void;
  onRemove: () => void;
}

const PhotoSlotCard: React.FC<PhotoSlotCardProps> = ({
  slot,
  gcpId,
  photo,
  onCapture,
  onPreview,
  onRemove,
}) => {
  if (photo?.dataUrl) {
    return (
      <div className="relative rounded-xl border border-slate-200 overflow-hidden group bg-slate-900 aspect-4/3 flex flex-col justify-between">
        <img
          src={photo.dataUrl}
          alt={slot.title}
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-200"
        />

        {/* Top Badges */}
        <div className="relative z-10 p-2 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <span className="text-[11px] font-bold text-white tracking-tight drop-shadow-xs">
            {slot.title}
          </span>
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* File Path Indicator */}
        <div className="relative z-10 px-2 py-0.5 text-[9px] font-mono text-slate-300 bg-black/60 truncate">
          {gcpId || 'GCP'}/{slot.folderFilename}
        </div>

        {/* Bottom Actions Overlay */}
        <div className="relative z-10 p-1.5 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          <button
            type="button"
            onClick={onPreview}
            className="p-1 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] flex items-center gap-1 backdrop-blur-xs"
          >
            <Eye className="w-3 h-3" />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={onRemove}
            title="Delete and retake"
            className="p-1 rounded bg-red-600/80 hover:bg-red-600 text-white"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCapture}
      className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 text-center transition-all min-h-[105px] group active:scale-[0.98]"
    >
      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center mb-1 transition-colors">
        {slot.icon}
      </div>
      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 leading-tight">
        {slot.title}
      </span>
      <span className="text-[10px] text-slate-500 mt-0.5 font-mono truncate max-w-full">
        {slot.folderFilename}
      </span>
    </button>
  );
};
