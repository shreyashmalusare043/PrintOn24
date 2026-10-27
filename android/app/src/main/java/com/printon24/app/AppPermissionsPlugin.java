package com.printon24.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "AppPermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class AppPermissionsPlugin extends Plugin {
    @PluginMethod
    public void getPermissionStatuses(PluginCall call) {
        call.resolve(createPermissionStatuses());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String alias = call.getString("permission");
        if (!"camera".equals(alias) && !"location".equals(alias) && !"notifications".equals(alias)) {
            call.reject("Choose a supported Android permission.");
            return;
        }

        PermissionState state = getPermissionState(alias);
        if (state == PermissionState.GRANTED) {
            call.resolve(createPermissionStatuses());
            return;
        }

        requestPermissionForAlias(alias, call, "permissionRequestCallback");
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not open Android app permission settings.", exception);
        }
    }

    @PermissionCallback
    private void permissionRequestCallback(PluginCall call) {
        call.resolve(createPermissionStatuses());
    }

    private JSObject createPermissionStatuses() {
        JSObject statuses = new JSObject();
        for (String alias : new String[] { "camera", "location", "notifications" }) {
            PermissionState state = getPermissionState(alias);
            statuses.put(alias, state == null ? "prompt" : state.toString());
        }
        return statuses;
    }
}
