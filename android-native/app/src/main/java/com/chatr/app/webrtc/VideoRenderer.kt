package com.chatr.app.webrtc

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import org.webrtc.EglBase
import org.webrtc.RendererCommon
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack

@Composable
fun VideoRenderer(
    videoTrack: VideoTrack?,
    modifier: Modifier = Modifier,
    mirror: Boolean = false,
    scalingType: RendererCommon.ScalingType = RendererCommon.ScalingType.SCALE_ASPECT_FILL
) {
    AndroidView(
        factory = { context ->
            SurfaceViewRenderer(context).apply {
                init(EglBase.create().eglBaseContext, null)
                setScalingType(scalingType)
                setMirror(mirror)
                setZOrderMediaOverlay(true)
                videoTrack?.addSink(this)
            }
        },
        modifier = modifier,
        onRelease = { view ->
            videoTrack?.removeSink(view)
            view.release()
        }
    )
}
