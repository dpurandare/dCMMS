import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from typing import List, Tuple, Dict, Any

class LSTMModel(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2, output_size: int = 48):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size, 
            hidden_size=hidden_size, 
            num_layers=num_layers, 
            batch_first=True,
            dropout=0.2
        )
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :]) # Decode the hidden state of the last time step
        return out

class SolarLSTMForecaster:
    def __init__(self, lookback_hours: int = 168, forecast_horizon: int = 48):
        self.lookback_hours = lookback_hours
        self.forecast_horizon = forecast_horizon
        self.scaler = MinMaxScaler()
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    def prepare_data(self, df: pd.DataFrame, target_col: str = 'generation_mw') -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Prepares sliding window sequences from the dataframe.
        """
        data = df[target_col].values
        scaled_data = self.scaler.fit_transform(data.reshape(-1, 1))
        
        X, y = [], []
        # Create sequences
        for i in range(len(scaled_data) - self.lookback_hours - self.forecast_horizon):
            X.append(scaled_data[i:(i + self.lookback_hours)])
            y.append(scaled_data[(i + self.lookback_hours):(i + self.lookback_hours + self.forecast_horizon)])
            
        return torch.FloatTensor(np.array(X)).to(self.device), torch.FloatTensor(np.array(y)).to(self.device)

    def train(self, df: pd.DataFrame, epochs: int = 50, batch_size: int = 32):
        """
        Trains the LSTM model.
        """
        X_train, y_train = self.prepare_data(df)
        dataset = torch.utils.data.TensorDataset(X_train, y_train)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        # Initialize model
        self.model = LSTMModel(input_size=1, output_size=self.forecast_horizon).to(self.device)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        
        self.model.train()
        print(f"Starting training on {self.device}...")
        
        for epoch in range(epochs):
            total_loss = 0
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                # Reshape y to match output dimensions [batch_size, horizon] if needed
                loss = criterion(outputs, batch_y.squeeze())
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            if (epoch + 1) % 10 == 0:
                print(f'Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(loader):.4f}')

    def predict(self, recent_history: np.ndarray) -> np.ndarray:
        """
        Generates forecast for the next horizon based on recent history.
        """
        self.model.eval()
        with torch.no_grad():
            # Scale input
            scaled_input = self.scaler.transform(recent_history.reshape(-1, 1))
            tensor_input = torch.FloatTensor(scaled_input).unsqueeze(0).to(self.device) # Add batch dimension [1, seq_len, 1]
            
            # Predict
            prediction = self.model(tensor_input)
            
            # Inverse scale
            prediction_inv = self.scaler.inverse_transform(prediction.cpu().numpy())
            return prediction_inv.flatten()
