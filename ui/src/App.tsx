import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { ActorsGrid } from "./components/ActorsGrid";
import { PromptEditor } from "./components/PromptEditor";
import { CaptionEditor } from "./components/CaptionEditor";
import { ImageGenerator } from "./components/ImageGenerator";
import type { Style } from "./types";
import "./index.css";
import { TrainingDataViewer } from "./components/TrainingDataViewer";
import { TrainingDataManager } from "./components/TrainingDataManager";
import { TrainingDataS3Manager } from "./components/TrainingDataS3Manager";
import { ActorTrainingDataManager } from "./components/ActorTrainingDataManager";
import { ActorTrainingTab } from "./components/ActorTraining";
import { Validator } from "./components/Validator/Validator";
import { Toaster } from "sonner";
import { ExportToBackendButton } from "./components/ExportToBackendButton";
import type { Actor } from "./types";
import { prefetchManager } from "./utils/prefetchManager";

interface TrainingTab {
  id: string;
  style: Style;
  version: "v1" | "v2";
  label: string;
}

interface TrainingManagerTab {
  id: string;
  style: Style;
  label: string;
}

interface S3ManagerTab {
  id: string;
  style: Style;
  label: string;
}

interface ActorTrainingTab {
  id: string;
  actor: Actor;
  label: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("tab1");
  const [trainingTab, setTrainingTab] = useState<TrainingTab | null>(null);
  const [trainingManagerTab, setTrainingManagerTab] =
    useState<TrainingManagerTab | null>(null);
  const [s3ManagerTab, setS3ManagerTab] = useState<S3ManagerTab | null>(null);
  const [actorTrainingTab, setActorTrainingTab] =
    useState<ActorTrainingTab | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [pendingImageGenLoad, setPendingImageGenLoad] = useState<{
    image: string;
    style: Style;
  } | null>(null);

  // Start background prefetching when actors are loaded
  useEffect(() => {
    if (actors.length > 0) {
      console.log("Starting background prefetch for", actors.length, "actors");

      // Start prefetching in background (non-blocking)
      prefetchManager.startPrefetch(actors);
    }
  }, [actors]);

  const handleCloseTrainingTab = () => {
    setTrainingTab(null);
    setActiveTab("tab1"); // Go back to Actors Library
  };

  const handleCloseTrainingManager = () => {
    setTrainingManagerTab(null);
    setActiveTab("tab1"); // Go back to Actors Library
  };

  const handleCloseS3Manager = () => {
    setS3ManagerTab(null);
    setActiveTab("tab1"); // Go back to Actors Library
  };

  const handleOpenActorTraining = (actor: Actor) => {
    const newTab: ActorTrainingTab = {
      id: `actor-training-${actor.id}`,
      actor,
      label: `${actor.name} - Training`,
    };
    setActorTrainingTab(newTab);
    setActiveTab(newTab.id);
  };

  const handleCloseActorTraining = () => {
    setActorTrainingTab(null);
    setActiveTab("tab1"); // Go back to Actors Library
  };

  const handleNavigateActorPrevious = () => {
    if (!actorTrainingTab || actors.length === 0) return;
    const currentIndex = actors.findIndex(
      (a) => a.id === actorTrainingTab.actor.id
    );
    if (currentIndex > 0) {
      handleOpenActorTraining(actors[currentIndex - 1]);
    }
  };

  const handleNavigateActorNext = () => {
    if (!actorTrainingTab || actors.length === 0) return;
    const currentIndex = actors.findIndex(
      (a) => a.id === actorTrainingTab.actor.id
    );
    if (currentIndex < actors.length - 1) {
      handleOpenActorTraining(actors[currentIndex + 1]);
    }
  };

  const getActorNavigationState = () => {
    if (!actorTrainingTab || actors.length === 0) {
      return { hasPrevious: false, hasNext: false };
    }
    const currentIndex = actors.findIndex(
      (a) => a.id === actorTrainingTab.actor.id
    );
    return {
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex < actors.length - 1,
    };
  };

  return (
    <div className="container">
      <Toaster position="top-right" richColors />
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1>Actors Maker</h1>
          <span className="header-separator">•</span>
          <p>LoRA actor model training and image generation toolkit</p>
        </div>
        <ExportToBackendButton />
      </header>

      <Tabs.Root
        className="TabsRoot"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Tabs.List className="TabsList" aria-label="Manage your actors">
          <Tabs.Trigger className="TabsTrigger" value="tab1">
            Actors Library
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="tab2">
            Prompt Editor
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="tab3">
            Caption Editor
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="tab4">
            Image Generation
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="tab5">
            Validator
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="tab6">
            Actor Training
          </Tabs.Trigger>

          {trainingTab && (
            <Tabs.Trigger
              className="TabsTrigger training-tab"
              value={trainingTab.id}
            >
              {trainingTab.label}
              <span
                className="tab-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTrainingTab();
                }}
                role="button"
                aria-label="Close tab"
              >
                ×
              </span>
            </Tabs.Trigger>
          )}

          {trainingManagerTab && (
            <Tabs.Trigger
              className="TabsTrigger training-tab"
              value={trainingManagerTab.id}
            >
              {trainingManagerTab.label}
              <span
                className="tab-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTrainingManager();
                }}
                role="button"
                aria-label="Close tab"
              >
                ×
              </span>
            </Tabs.Trigger>
          )}

          {s3ManagerTab && (
            <Tabs.Trigger
              className="TabsTrigger training-tab"
              value={s3ManagerTab.id}
            >
              {s3ManagerTab.label}
              <span
                className="tab-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseS3Manager();
                }}
                role="button"
                aria-label="Close tab"
              >
                ×
              </span>
            </Tabs.Trigger>
          )}

          {actorTrainingTab && (
            <Tabs.Trigger
              className="TabsTrigger training-tab"
              value={actorTrainingTab.id}
            >
              {actorTrainingTab.label}
              <span
                className="tab-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseActorTraining();
                }}
                role="button"
                aria-label="Close tab"
              >
                ×
              </span>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content className="TabsContent" value="tab1">
          <ActorsGrid
            onOpenTrainingData={handleOpenActorTraining}
            onActorsLoaded={setActors}
          />
        </Tabs.Content>

        <Tabs.Content className="TabsContent" value="tab2">
          <PromptEditor />
        </Tabs.Content>

        <Tabs.Content className="TabsContent" value="tab3">
          <CaptionEditor />
        </Tabs.Content>

        <Tabs.Content className="TabsContent" value="tab4">
          <ImageGenerator
            pendingLoad={pendingImageGenLoad}
            onLoadComplete={() => setPendingImageGenLoad(null)}
          />
        </Tabs.Content>

        <Tabs.Content className="TabsContent" value="tab5">
          <Validator />
        </Tabs.Content>

        <Tabs.Content className="TabsContent" value="tab6">
          <ActorTrainingTab />
        </Tabs.Content>

        {trainingTab && (
          <Tabs.Content className="TabsContent" value={trainingTab.id}>
            <TrainingDataViewer
              style={trainingTab.style}
              version={trainingTab.version}
              onClose={handleCloseTrainingTab}
            />
          </Tabs.Content>
        )}

        {trainingManagerTab && (
          <Tabs.Content className="TabsContent" value={trainingManagerTab.id}>
            <TrainingDataManager
              style={trainingManagerTab.style}
              onClose={handleCloseTrainingManager}
              onSendToImageGen={(baseImage) => {
                // Set pending load data and switch to image generation tab
                setPendingImageGenLoad({
                  image: baseImage,
                  style: trainingManagerTab.style,
                });
                setActiveTab("tab4");
              }}
            />
          </Tabs.Content>
        )}

        {s3ManagerTab && (
          <Tabs.Content className="TabsContent" value={s3ManagerTab.id}>
            <TrainingDataS3Manager
              style={s3ManagerTab.style}
              onClose={handleCloseS3Manager}
            />
          </Tabs.Content>
        )}

        {actorTrainingTab && (
          <Tabs.Content className="TabsContent" value={actorTrainingTab.id}>
            <ActorTrainingDataManager
              actor={actorTrainingTab.actor}
              onClose={handleCloseActorTraining}
              onNavigatePrevious={handleNavigateActorPrevious}
              onNavigateNext={handleNavigateActorNext}
              hasPrevious={getActorNavigationState().hasPrevious}
              hasNext={getActorNavigationState().hasNext}
            />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  );
}

export default App;
