import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe[:x.size(0), :]

class TransformerModel(nn.Module):
    def __init__(self, feature_size: int = 1, d_model: int = 64, nhead: int = 4, num_layers: int = 2, output_size: int = 48):
        super(TransformerModel, self).__init__()
        self.model_type = 'Transformer'
        self.d_model = d_model
        
        # Input embedding to project features to d_model dimension
        self.embedding = nn.Linear(feature_size, d_model) 
        self.pos_encoder = PositionalEncoding(d_model)
        
        encoder_layers = nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, dim_feedforward=128, dropout=0.1, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        self.decoder = nn.Linear(d_model, output_size)

    def forward(self, src):
        # src shape: [batch_size, seq_len, feature_size]
        src = self.embedding(src) # [batch_size, seq_len, d_model]
        src = self.pos_encoder(src)
        
        # Transformer output: [batch_size, seq_len, d_model]
        output = self.transformer_encoder(src)
        
        # Take the last time step for prediction
        # [batch_size, d_model]
        output = output[:, -1, :] 
        
        prediction = self.decoder(output)
        return prediction

class SolarTransformerForecaster:
    def __init__(self, lookback_hours: int = 168, forecast_horizon: int = 48):
        self.lookback_hours = lookback_hours
        self.forecast_horizon = forecast_horizon
        self.scaler = MinMaxScaler()
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    def prepare_data(self, df: pd.DataFrame, target_col: str = 'generation_mw') -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Prepares sliding window sequences for Transformer.
        """
        data = df[target_col].values
        scaled_data = self.scaler.fit_transform(data.reshape(-1, 1))
        
        X, y = [], []
        for i in range(len(scaled_data) - self.lookback_hours - self.forecast_horizon):
            X.append(scaled_data[i:(i + self.lookback_hours)])
            y.append(scaled_data[(i + self.lookback_hours):(i + self.lookback_hours + self.forecast_horizon)])
            
        return torch.FloatTensor(np.array(X)).to(self.device), torch.FloatTensor(np.array(y)).to(self.device)

    def train(self, df: pd.DataFrame, epochs: int = 50, batch_size: int = 32):
        X_train, y_train = self.prepare_data(df)
        dataset = torch.utils.data.TensorDataset(X_train, y_train)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        self.model = TransformerModel(output_size=self.forecast_horizon).to(self.device)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.0005)
        
        self.model.train()
        print(f"Starting Transformer training on {self.device}...")
        
        for epoch in range(epochs):
            total_loss = 0
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y.squeeze())
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            if (epoch + 1) % 10 == 0:
                print(f'Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(loader):.4f}')

    def predict(self, recent_history: np.ndarray) -> np.ndarray:
        self.model.eval()
        with torch.no_grad():
            scaled_input = self.scaler.transform(recent_history.reshape(-1, 1))
            tensor_input = torch.FloatTensor(scaled_input).unsqueeze(0).to(self.device)
            prediction = self.model(tensor_input)
            prediction_inv = self.scaler.inverse_transform(prediction.cpu().numpy())
            return prediction_inv.flatten()
