import { useState } from 'react';
import type { TrainingDataManagerProps } from './types';
import { useTrainingDataManager } from '../../hooks/useTrainingDataManager';
import { SettingsModalRedesigned } from '../ImageGenerator/components/SettingsModalRedesigned';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { TrainingHeader } from './TrainingHeader';
import { TrainingProgressBar } from './TrainingProgressBar';
import { TrainingToolbar } from './TrainingToolbar';
import { TrainingGrid } from './TrainingGrid';
import './TrainingDataManager.css';

export function TrainingDataManager({ style, onClose, onSendToImageGen }: TrainingDataManagerProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const {
    // Settings
    settings,
    
    // Selection
    baseImages,
    selectedCount,
    toggleSelection,
    selectAll,
    deselectAll,
    selectMissing,
    
    // Images data
    trainingImages,
    loading,
    error,
    imageRefreshKey,
    imageMap,
    missingCount,
    loadData,
    
    // Generation
    processingState,
    generateSelected,
    generateMissing,
    deleteTrainingImage,
    recreateTrainingImage,
    abortGeneration,
  } = useTrainingDataManager(style);

  function handleSendToImageGen(baseImage: any, trainingImage?: any) {
    if (onSendToImageGen) {
      onSendToImageGen(baseImage.path, trainingImage?.path);
    }
  }

  async function handleCloseSettingsModal() {
    await settings.saveSettings();
    setShowSettingsModal(false);
  }

  // Loading state
  if (loading) {
    return <LoadingState style={style} />;
  }

  // Error state
  if (error) {
    return <ErrorState style={style} error={error} onRetry={() => loadData(true)} />;
  }

  const totalTrainingImages = trainingImages.length;

  return (
    <div className="training-data-manager">
      <TrainingHeader
        style={style}
        baseImagesCount={baseImages.length}
        totalTrainingImages={totalTrainingImages}
        missingCount={missingCount}
        selectedCount={selectedCount}
        processingState={processingState}
        onGenerateMissing={generateMissing}
        onGenerateSelected={generateSelected}
        onOpenSettings={() => setShowSettingsModal(true)}
        onClose={onClose}
        onAbort={abortGeneration}
      />

      <TrainingProgressBar processingState={processingState} />

      <TrainingToolbar
        baseImagesCount={baseImages.length}
        missingCount={missingCount}
        selectedCount={selectedCount}
        onSelectAll={selectAll}
        onSelectMissing={() => selectMissing(imageMap)}
        onDeselectAll={deselectAll}
      />

      <TrainingGrid
        baseImages={baseImages}
        imageMap={imageMap}
        imageRefreshKey={imageRefreshKey}
        onToggleSelection={toggleSelection}
        onSendToImageGen={handleSendToImageGen}
        onRecreate={recreateTrainingImage}
        onDelete={deleteTrainingImage}
        onGenerate={(baseImage) => recreateTrainingImage(baseImage)}
      />

      {baseImages.length === 0 && <EmptyState />}

      <SettingsModalRedesigned
        show={showSettingsModal}
        selectedStyle={style.id}
        styles={[style]}
        seed={settings.seed}
        seedLocked={settings.seedLocked}
        steps={settings.steps}
        cfg={settings.cfg}
        denoise={settings.denoise}
        guidance={settings.guidance}
        width={settings.width}
        height={settings.height}
        samplerName={settings.samplerName}
        schedulerName={settings.schedulerName}
        loraStrengthModel={settings.loraStrengthModel}
        loraStrengthClip={settings.loraStrengthClip}
        monochromeContrast={settings.monochromeContrast}
        monochromeBrightness={settings.monochromeBrightness}
        frontpad={settings.frontpad}
        backpad={settings.backpad}
        saveStatus={settings.saveStatus}
        loading={processingState.isGenerating}
        onClose={handleCloseSettingsModal}
        onSave={settings.saveSettings}
        onReset={settings.resetSettings}
        onResetLoraToDefault={settings.resetLoraToDefault}
        onRandomizeSeed={settings.randomizeSeed}
        setSeed={settings.setSeed}
        setSeedLocked={settings.setSeedLocked}
        setSteps={settings.setSteps}
        setCfg={settings.setCfg}
        setDenoise={settings.setDenoise}
        setGuidance={settings.setGuidance}
        setWidth={settings.setWidth}
        setHeight={settings.setHeight}
        setSamplerName={settings.setSamplerName}
        setSchedulerName={settings.setSchedulerName}
        setLoraStrengthModel={settings.setLoraStrengthModel}
        setLoraStrengthClip={settings.setLoraStrengthClip}
        setMonochromeContrast={settings.setMonochromeContrast}
        setMonochromeBrightness={settings.setMonochromeBrightness}
        setFrontpad={settings.setFrontpad}
        setBackpad={settings.setBackpad}
      />
    </div>
  );
}
