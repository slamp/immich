/// <reference types="chromecast-caf-sender" />

import { PUBLIC_IMMICH_CAST_APPLICATION_ID } from '$env/static/public';
import { createApiKey, deleteApiKey, getApiKeys, Permission } from '@immich/sdk';

const CAST_API_KEY_NAME = 'cast';

const FRAMEWORK_LINK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

enum DEVICE_STATE {
  IDLE = 0,
  ACTIVE = 1,
  WARNING = 2,
  ERROR = 3,
}

enum SESSION_DISCOVERY_CAUSE {
  LOAD_MEDIA,
  ACTIVE_SESSION,
}

class CastPlayer {
  session: chrome.cast.Session | null = null;

  deviceState = DEVICE_STATE.IDLE;

  castPlayerState = chrome.cast.media.PlayerState.IDLE;

  isInitialized = false;

  readonly errorHandler = this.onError.bind(this);

  hasReceivers = false;

  currentMedia: chrome.cast.media.Media | null = null;

  private constructor() {}

  private static instance: CastPlayer;

  async getInstance() {
    if (CastPlayer.instance) {
      return CastPlayer.instance;
    }

    CastPlayer.instance = new CastPlayer();

    const chrome = window.chrome;
    if (!chrome) {
      console.warn('Not initializing cast player: chrome object is missing');
      return;
    }

    const applicationId = PUBLIC_IMMICH_CAST_APPLICATION_ID;

    const sessionRequest = new chrome.cast.SessionRequest(applicationId);

    const apiConfig = new chrome.cast.ApiConfig(
      sessionRequest,
      this.sessionListener.bind(this),
      this.receiverListener.bind(this),
    );
    console.debug(`Initializing cast player, applicationId=${applicationId}`);
    chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.errorHandler);

    return CastPlayer.instance;
  }

  onInitSuccess() {
    this.isInitialized = true;
    console.debug('cast player initialized');
  }

  onError() {
    console.debug('cast player error');
  }

  sessionListener(session: chrome.cast.Session) {
    this.session = session;
    if (this.session) {
      // Session already exists, join the session and sync up media status
      if (this.session.media[0]) {
        this.onMediaDiscovered(SESSION_DISCOVERY_CAUSE.ACTIVE_SESSION, this.session.media[0]);
      }

      this.onSessionConnected(session);
    }
  }

  receiverListener(receiver: chrome.cast.ReceiverAvailability) {
    if (receiver === chrome.cast.ReceiverAvailability.AVAILABLE) {
      console.debug('cast receiver found');
      this.hasReceivers = true;
    } else {
      console.debug('cast receiver list empty');
      this.hasReceivers = false;
    }
  }

  onMediaDiscovered(cause: SESSION_DISCOVERY_CAUSE, currentMedia: chrome.cast.media.Media) {
    this.currentMedia = currentMedia;

    if (cause === SESSION_DISCOVERY_CAUSE.LOAD_MEDIA) {
      this.castPlayerState = chrome.cast.media.PlayerState.PLAYING;
    } else if (cause === SESSION_DISCOVERY_CAUSE.ACTIVE_SESSION) {
      this.castPlayerState = currentMedia.playerState;
    }

    this.currentMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
  }

  onMediaStatusUpdate(mediaStillAlive: boolean) {
    if (!mediaStillAlive) {
      this.castPlayerState = chrome.cast.media.PlayerState.IDLE;
    }
  }

  onSessionConnected(session: chrome.cast.Session) {
    this.session = session;
    this.deviceState = DEVICE_STATE.ACTIVE;

    this.session.addMediaListener(this.sessionMediaListener.bind(this));
    this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
  }

  sessionMediaListener(currentMedia: chrome.cast.media.Media) {
    this.currentMedia = currentMedia;
    this.currentMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
  }

  sessionUpdateListener() {
    if (this.session?.status === chrome.cast.SessionStatus.STOPPED) {
      this.session = null;
      this.deviceState = DEVICE_STATE.IDLE;
      this.castPlayerState = chrome.cast.media.PlayerState.IDLE;

      this.currentMedia = null;
    }
  }
}

export const loadCastFramework = (() => {
  let promise: Promise<typeof cast> | undefined;

  return () => {
    if (promise === undefined) {
      promise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = FRAMEWORK_LINK;
        window.__onGCastApiAvailable = (isAvailable) => {
          if (isAvailable) {
            cast.framework.CastContext.getInstance().setOptions({
              receiverApplicationId: PUBLIC_IMMICH_CAST_APPLICATION_ID,
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });

            resolve(cast);
          }
        };
        document.body.appendChild(script);
      });
    }
    return promise;
  };
})();

export const isCasting = (): boolean => {
  return cast.framework.CastContext.getInstance().getCurrentSession() !== null;
};

export const createCastApiKey = async () => {
  try {
    const data = await createApiKey({
      apiKeyCreateDto: {
        name: CAST_API_KEY_NAME,
        permissions: [Permission.AssetView],
      },
    });
    return data;
  } catch (error) {
    console.error('Failed to create cast api key', error);
  }
};

export const getCastApiKey = async () => {
  const currentKeys = await getApiKeys();

  let previousKey = currentKeys.find((key) => key.name == 'cast');

  if (previousKey) {
    await deleteApiKey({ id: previousKey.id });
  }

  return await createCastApiKey();
};

export const castAsset = async (url: string) => {
  const apiKey = await getCastApiKey();

  if (!apiKey) {
    console.error('No cast api available');
    return;
  }

  let contentType: string | null = null;

  await fetch(url, { method: 'HEAD' }).then((response) => {
    contentType = response.headers.get('content-type');
  });

  if (!contentType) {
    console.error('Could not get content type for url ' + url);
    return;
  }

  const authenticatedUrl = `${url}&apiKey=${apiKey.secret}`;
  const mediaInfo = new chrome.cast.media.MediaInfo(authenticatedUrl, contentType);
  const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
  const request = new chrome.cast.media.LoadRequest(mediaInfo);

  if (!castSession) {
    return;
  }
  return castSession.loadMedia(request);
};
