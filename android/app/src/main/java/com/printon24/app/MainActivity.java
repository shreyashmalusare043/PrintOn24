package com.printon24.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedFilesPlugin.class);
        registerPlugin(AppPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        if (getBridge() == null) return;
        PluginHandle pluginHandle = getBridge().getPlugin("SharedFiles");
        if (pluginHandle != null && pluginHandle.getInstance() instanceof SharedFilesPlugin) {
            ((SharedFilesPlugin) pluginHandle.getInstance()).handleNewIntent(intent);
        }
    }
}
